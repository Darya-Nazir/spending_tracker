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

describe('GET /api/balance', () => {
    test('returns the initial balance as a number when there are no operations', async () => {
        // возвращает стартовый баланс числом при отсутствии операций
        for (const initialBalance of [0, 125.5]) {
            const user = await createUser(database, { initialBalance });
            const response = await request(app).get('/api/balance').set(auth(user.id));

            assert.equal(response.status, 200);
            assert.equal(response.type, 'application/json');
            assert.deepEqual(response.body, { balance: initialBalance });
        }
    });

    test('adds income and subtracts expenses from the initial balance, including negative totals', async () => {
        // прибавляет доходы и вычитает расходы из стартового баланса, включая отрицательный итог
        for (const [expense, balance] of [[30.25, 80.5], [130.75, -20]] as const) {
            const user = await createUser(database, { initialBalance: 10.25 });
            await addOperations(user.id, 100.5, expense);

            const response = await request(app).get('/api/balance').set(auth(user.id));

            assert.equal(response.status, 200);
            assert.deepEqual(response.body, { balance });
        }
    });

});
