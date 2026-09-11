import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';

import { AppFactory } from '../../../src/http/app.ts';
import { TokenService } from '../../../src/modules/identity/auth/token.service.ts';
import { useTestApp } from '../../helpers/app.ts';
import { createTestDatabase, TEST_DATABASE_URL } from '../../helpers/db.ts';
import { createUser } from '../../helpers/factories.ts';
import { bearerAuth } from '../../helpers/auth.ts';

/**
 * GET /api/finance/status — единственный маршрут, который клиент вызывает
 * до готовности аккаунта. Причина отказа наружу не выходит: она нужна для
 * разбора и лежит в finance.accounts рядом со статусом.
 */

const { app, config, database } = useTestApp();
const tokens = new TokenService(config);
const auth = (userId: number) => bearerAuth(tokens.issueTokenPair(userId).accessToken);

// Порт 1 не слушает никто: соединение отклоняется сразу, без ожидания таймаута.
const UNREACHABLE_FINANCE_URL = 'postgres://spending:spending@127.0.0.1:1/spending_test';

test('reports pending while the account is being prepared and when its row is missing', async () => {
    // отдаёт pending, пока аккаунт готовится, и при отсутствующей строке
    const preparing = await createUser(database, { status: 'pending' });
    const withoutAccount = await createUser(database);
    await database.query('delete from finance.accounts where user_id = $1', [withoutAccount.id]);

    const first = await request(app).get('/api/finance/status').set(auth(preparing.id)).expect(200);
    assert.equal(first.type, 'application/json');
    assert.deepEqual(first.body, { status: 'pending' });

    const second = await request(app).get('/api/finance/status')
        .set(auth(withoutAccount.id)).expect(200);
    assert.deepEqual(second.body, { status: 'pending' });
});

test('reports the status of the authenticated user only', async () => {
    // отдаёт статус только аутентифицированного пользователя
    const owner = await createUser(database);
    const other = await createUser(database, { status: 'pending' });

    const response = await request(app).get(`/api/finance/status?userId=${other.id}`)
        .set(auth(owner.id)).send({ user: { userId: other.id } }).expect(200);

    assert.deepEqual(response.body, { status: 'ready' });
});

test('reports failed without leaking the reason', async () => {
    // отдаёт failed, не раскрывая причину
    const user = await createUser(database, { status: 'pending' });
    await database.query(
        "update finance.accounts set status = 'failed', status_reason = $2 where user_id = $1",
        [user.id, 'system expense category conflict'],
    );

    const response = await request(app).get('/api/finance/status').set(auth(user.id)).expect(200);

    assert.deepEqual(response.body, { status: 'failed' });
});

test('answers 503 FINANCE_UNAVAILABLE with Retry-After when finance is unreachable', async () => {
    // отвечает 503 FINANCE_UNAVAILABLE с Retry-After, когда finance недоступна
    const context = createTestDatabase(TEST_DATABASE_URL, { finance: UNREACHABLE_FINANCE_URL });
    const isolated = new AppFactory(context.config, context.logger, context.connections).build();
    const header = bearerAuth(new TokenService(context.config).issueTokenPair(1).accessToken);

    try {
        const response = await request(isolated).get('/api/finance/status').set(header).expect(503);

        assert.equal(response.type, 'application/json');
        assert.equal(response.body.error, true);
        assert.equal(response.body.code, 'FINANCE_UNAVAILABLE');
        assert.equal(typeof response.body.message, 'string');
        assert.equal(response.headers['retry-after'], '2');
    } finally {
        // Пока соединения открыты, node:test не выходит после последнего теста.
        await Promise.all([context.connections.close(), context.database.close()]);
    }
});
