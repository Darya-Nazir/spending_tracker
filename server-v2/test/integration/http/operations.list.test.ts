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

describe('GET /api/operations', () => {
    test('returns an empty array when there are no operations', async () => {
        // возвращает пустой массив при отсутствии операций
        const user = await createUser(database);
        const response = await request(app).get('/api/operations?period=all').set(auth(user.id));

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, []);
    });

    test('lists all operations with category titles in descending date and ID order', async () => {
        // возвращает все операции с названиями категорий по убыванию даты и ID
        const user = await createUser(database);
        await new CategoryRepository(database).seedDefaults(user.id);
        const operations = [
            { type: 'income', amount: 100.5, date: '2026-02-12', comment: 'Оклад', category: 'Зарплата' },
            { type: 'expense', amount: 30.25, date: '2026-02-12', comment: '', category: 'Еда' },
            { type: 'expense', amount: 12, date: '2020-01-01', comment: 'Архив', category: 'Еда' },
        ];
        const saved = [];
        for (const operation of operations) {
            const { rows } = await database.query<{ id: number }>(
                `insert into operations (user_id, category_id, type, amount, date, comment)
                 select user_id, id, type, $3, $4, $5 from categories
                  where user_id = $1 and type = $2 and title = $6
                 returning id`,
                [user.id, operation.type, operation.amount, operation.date, operation.comment, operation.category],
            );
            assert.equal(rows.length, 1);
            saved.push({ id: rows[0]!.id, ...operation });
        }

        for (const query of ['', '?period=all&type=income']) {
            const response = await request(app).get(`/api/operations${query}`).set(auth(user.id));

            assert.equal(response.status, 200);
            assert.deepEqual(response.body, [saved[1], saved[0], saved[2]]);
        }
    });
});
