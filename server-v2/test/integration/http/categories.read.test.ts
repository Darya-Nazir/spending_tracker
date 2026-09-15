import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';

import { TokenService } from '../../../src/modules/auth/token.service.ts';
import { useTestApp } from '../../helpers/app.ts';
import { bearerAuth } from '../../helpers/auth.ts';

const { app, config, database } = useTestApp();
const tokens = new TokenService(config);
const types = ['expense', 'income'] as const;

const register = async (email: string) => {
    const response = await request(app).post('/api/signup').send({
        name: 'Дарья', email, password: 'secret1', passwordRepeat: 'secret1',
    });
    assert.equal(response.status, 201);
    const userId: number = response.body.user.id;
    const { rows: categories } = await database.query<{
        id: number; title: string; type: string;
    }>('select id, title, type from categories where user_id = $1 order by id', [userId]);

    return { categories, auth: bearerAuth(tokens.issueTokenPair(userId).accessToken) };
};

describe('GET /api/categories', () => {
    test('lists only the caller categories of the requested type as id and title', async () => {
        // возвращает только категории вызывающего пользователя указанного типа с полями id и title
        const user = await register('owner@example.test');
        await register('other@example.test');

        for (const type of types) {
            const expected = user.categories.filter((category) => category.type === type)
                .map(({ id, title }) => ({ id, title }));
            assert.equal(expected.length, type === 'expense' ? 10 : 5);
            assert.ok(expected.some(({ title }) => title === 'Общее'));

            const response = await request(app).get(`/api/categories/${type}`).set(user.auth);

            assert.equal(response.status, 200);
            assert.equal(response.type, 'application/json');
            assert.ok(Array.isArray(response.body));
            assert.deepEqual(response.body.sort((a: { id: number }, b: { id: number }) => a.id - b.id), expected);
        }
    });

    test('reads an owned category and returns 404 for another owner or type', async () => {
        // читает свою категорию и возвращает 404 для другого владельца или типа
        const owner = await register('owner@example.test');
        const other = await register('other@example.test');

        for (const type of types) {
            const category = owner.categories.find((item) => item.type === type);
            assert.ok(category);
            const path = `/api/categories/${type}/${category.id}`;
            const response = await request(app).get(path).set(owner.auth);

            assert.equal(response.status, 200);
            assert.equal(response.type, 'application/json');
            assert.deepEqual(response.body, { id: category.id, title: category.title });

            const wrongType = type === 'expense' ? 'income' : 'expense';
            for (const rejected of [
                await request(app).get(path).set(other.auth),
                await request(app).get(`/api/categories/${wrongType}/${category.id}`).set(owner.auth),
            ]) {
                assert.equal(rejected.status, 404);
            }
        }
    });

    test('returns 400 for an invalid category ID', async () => {
        // возвращает 400 для некорректного ID категории
        const user = await register('owner@example.test');

        for (const type of types) {
            for (const id of ['abc', '1abc', '0', '-1', '1.5']) {
                const response = await request(app).get(`/api/categories/${type}/${id}`).set(user.auth);

                assert.equal(response.status, 400, `${type}/${id}`);
            }
        }
    });

    test('requires an access token for lists and individual categories', async () => {
        // требует access-токен для списков и отдельных категорий
        const user = await register('owner@example.test');

        for (const type of types) {
            const category = user.categories.find((item) => item.type === type);
            assert.ok(category);
            for (const path of [`/api/categories/${type}`, `/api/categories/${type}/${category.id}`]) {
                const response = await request(app).get(path);

                assert.equal(response.status, 401, path);
            }
        }
    });
});
