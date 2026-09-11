import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';

import { OutboxRepository } from '../../../src/modules/identity/outbox/outbox.repository.ts';
import { useTestApp } from '../../helpers/app.ts';
import { createUser } from '../../helpers/factories.ts';

const { app, database } = useTestApp();

const signup = {
    name: 'Outbox User',
    email: 'outbox@example.test',
    password: 'secret1',
    passwordRepeat: 'secret1',
};

const countRows = async (sql: string): Promise<number> => {
    const { rows } = await database.query<{ count: number }>(sql);
    return rows[0]?.count ?? -1;
};

test('rolls back the user when the registration event cannot be written', async () => {
    // откатывает пользователя, если событие регистрации записать не удалось
    await database.query(
        "alter table identity.outbox add constraint test_outbox_failure check (user_id < 0)",
    );
    try {
        await request(app).post('/api/signup').send(signup).expect(500);

        assert.equal(await countRows('select count(*)::integer as count from identity.users'), 0);
        assert.equal(await countRows('select count(*)::integer as count from identity.outbox'), 0);
    } finally {
        await database.query('alter table identity.outbox drop constraint test_outbox_failure');
    }
});

test('keeps signup working and the event pending while finance is unavailable', async () => {
    // сохраняет успешный signup и ожидающее событие при недоступном finance
    await request(app).post('/api/signup').send(signup).expect(201);

    const { rows } = await database.query(
        'select type, version, delivered_at, available_at <= now() as due from identity.outbox',
    );
    assert.deepEqual(rows, [{ type: 'UserRegistered', version: 1, delivered_at: null, due: true }]);
});

test('enqueues one event per user on a repeated backfill', async () => {
    // ставит одно событие на пользователя при повторной постановке
    const first = await createUser(database);
    const second = await createUser(database);
    const outbox = new OutboxRepository(database);

    assert.equal(await outbox.backfillUserRegistered(), 2);
    assert.equal(await outbox.backfillUserRegistered(), 0);

    const { rows } = await database.query('select user_id from identity.outbox order by user_id');
    assert.deepEqual(rows, [{ user_id: first.id }, { user_id: second.id }]);
});
