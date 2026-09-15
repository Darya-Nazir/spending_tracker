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
const categories = new CategoryRepository(database);
const authFor = (userId: number) => bearerAuth(tokens.issueTokenPair(userId).accessToken);

describe('POST and PUT /api/categories', () => {
    test('creates and renames categories with normalized titles scoped to owner and type', async () => {
        // создаёт и переименовывает категории с нормализованными названиями в пределах владельца и типа
        const owner = await createUser(database);
        const other = await createUser(database);

        for (const user of [owner, other]) {
            for (const type of ['expense', 'income']) {
                const path = `/api/categories/${type}`;
                const auth = authFor(user.id);
                const created = await request(app).post(path).set(auth).send({ title: 'Кофе Café' });
                const id: number = created.body.id;

                assert.equal(typeof id, 'number');
                assert.deepEqual(created.body, { id, title: 'Кофе Café' });
                const { rows: inserted } = await database.query(
                    'select user_id, type, title, title_normalized from categories where id = $1', [id],
                );
                assert.deepEqual(inserted, [{
                    user_id: user.id, type, title: 'Кофе Café', title_normalized: 'кофе café',
                }]);

                const renamed = await request(app).put(`${path}/${id}`).set(auth).send({ title: 'Чай Tea' });

                assert.deepEqual(renamed.body, { id, title: 'Чай Tea' });
                const { rows: updated } = await database.query(
                    'select user_id, type, title, title_normalized from categories where id = $1', [id],
                );
                assert.deepEqual(updated, [{
                    user_id: user.id, type, title: 'Чай Tea', title_normalized: 'чай tea',
                }]);
            }
        }
    });

    test('concurrent creates of the same normalized title persist one category and report one conflict', async () => {
        // одновременные создания одного нормализованного названия сохраняют одну категорию и возвращают один конфликт
        const user = await createUser(database);
        const auth = authFor(user.id);

        const responses = await Promise.all(['Кофе Café', 'КОФЕ CAFÉ'].map((title) =>
            request(app).post('/api/categories/expense').set(auth).send({ title }),
        ));

        const successes = responses.filter(({ status }) => status >= 200 && status < 300);
        const conflicts = responses.filter(({ status }) => status === 409);
        assert.equal(successes.length, 1);
        assert.equal(conflicts.length, 1);
        assert.match(conflicts[0]!.body.message, /already exist/i);
        const { rows } = await database.query(
            'select id, title, title_normalized from categories where user_id = $1', [user.id],
        );
        assert.deepEqual(rows, [{ ...successes[0]!.body, title_normalized: 'кофе café' }]);
    });

    test('renaming to an existing normalized title reports a conflict and preserves both categories', async () => {
        // переименование в существующее нормализованное название возвращает конфликт и сохраняет обе категории
        const user = await createUser(database);
        await categories.seedDefaults(user.id);
        const before = await categories.list(user.id, 'expense');
        const category = before.find(({ title }) => title === 'Спорт')!;

        const response = await request(app).put(`/api/categories/expense/${category.id}`)
            .set(authFor(user.id)).send({ title: 'ЕДА' });

        assert.equal(response.status, 409);
        assert.match(response.body.message, /already exist/i);
        assert.deepEqual(await categories.list(user.id, 'expense'), before);
        const { rows } = await database.query(
            'select title_normalized from categories where id = $1', [category.id],
        );
        assert.deepEqual(rows, [{ title_normalized: 'спорт' }]);
    });

});
