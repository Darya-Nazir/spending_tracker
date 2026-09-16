import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';

import { TokenService } from '../../../src/modules/auth/token.service.ts';
import { CategoryRepository } from '../../../src/modules/categories/category.repository.ts';
import { useTestApp } from '../../helpers/app.ts';
import { bearerAuth } from '../../helpers/auth.ts';
import { createUser } from '../../helpers/factories.ts';

const { app, config, database } = useTestApp();
const tokens = new TokenService(config);
const auth = (userId: number) => bearerAuth(tokens.issueTokenPair(userId).accessToken);

const addOperations = async (userId: number, income: number, expense: number) => {
    await new CategoryRepository(database).seedDefaults(userId);
    await database.query(
        `insert into operations (user_id, category_id, type, amount, date)
         select user_id, id, type,
                case when type = 'income' then $2::numeric else $3::numeric end,
                '2026-09-01'::date
           from categories where user_id = $1 and is_default`,
        [userId, income, expense],
    );
};

describe('PUT /api/balance', () => {
    test('sets initial_balance and returns it recomputed with existing operations', async () => {
        // задаёт initial_balance и возвращает пересчитанный с учётом операций баланс
        const user = await createUser(database, { initialBalance: 10 });
        await addOperations(user.id, 100, 30);

        const response = await request(app).put('/api/balance').set(auth(user.id)).send({ balance: 500 });

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { balance: 570 });
        const { rows } = await database.query('select initial_balance from users where id = $1', [user.id]);
        assert.deepEqual(rows, [{ initial_balance: 500 }]);
    });

    test('does not change initial_balance of another user', async () => {
        // не меняет initial_balance другого пользователя
        const owner = await createUser(database, { initialBalance: 10 });
        const other = await createUser(database, { initialBalance: 20 });

        const response = await request(app).put('/api/balance').set(auth(owner.id)).send({ balance: 999 });

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { balance: 999 });
        const { rows } = await database.query('select initial_balance from users where id = $1', [other.id]);
        assert.deepEqual(rows, [{ initial_balance: 20 }]);
    });
});
