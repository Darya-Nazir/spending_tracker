import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';

import { CategoryTitleService } from '../../src/modules/categories/category-title.service.ts';
import { PasswordService } from '../../src/modules/auth/password.service.ts';
import { useTestApp } from '../helpers/app.ts';

const { app, config, database } = useTestApp();

const validSignup = {
    name: 'Дарья',
    email: 'Darya@Example.test',
    password: 'secret1',
    passwordRepeat: 'secret1',
};

describe('POST /api/signup', () => {
    test('seeds categories for each user', async () => {
        // создаёт стандартные категории для каждого пользователя
        for (const email of [validSignup.email, 'second@example.test']) {
            const response = await request(app)
                .post('/api/signup')
                .send({ ...validSignup, email });
            assert.equal(response.status, 201);

            const { rows } = await database.query<{
                type: string;
                title: string;
                is_default: boolean;
            }>(
                `select type, title, is_default
                   from categories where user_id = $1`,
                [response.body.user.id],
            );

            assert.equal(rows.length, 15);
            assert.equal(rows.filter(({ type }) => type === 'expense').length, 10);
            assert.equal(rows.filter(({ type }) => type === 'income').length, 5);
            assert.deepEqual(
                rows.filter(({ is_default }) => is_default)
                    .map(({ type, title }) => ({ type, title }))
                    .sort((a, b) => a.type.localeCompare(b.type)),
                [{ type: 'expense', title: 'Общее' }, { type: 'income', title: 'Общее' }],
            );
        }
    });

    test('normalizes seeded category titles', async () => {
        // нормализует названия стандартных категорий
        const response = await request(app).post('/api/signup').send(validSignup);
        assert.equal(response.status, 201);

        const { rows } = await database.query<{ title: string; title_normalized: string }>(
            'select title, title_normalized from categories where user_id = $1',
            [response.body.user.id],
        );
        assert.ok(rows.length > 0, 'Signup must create categories');
        const titles = new CategoryTitleService();
        for (const category of rows) {
            assert.equal(category.title_normalized, titles.normalize(category.title));
        }
    });

    test('rolls back failed signup and allows retry', async () => {
        // откатывает регистрацию при сбое и позволяет повторить попытку
        await database.query(
            `alter table categories add constraint test_reject_signup_categories
             check (type = 'expense') not valid`,
        );
        try {
            const response = await request(app)
                .post('/api/signup')
                .send(validSignup);

            const { rows } = await database.query(
                `select (select count(*)::integer from users) as users,
                        (select count(*)::integer from categories) as categories`,
            );
            assert.deepEqual(rows, [{ users: 0, categories: 0 }]);
            assert.equal(response.status, 500);
            assert.equal(response.body.error, true);
        } finally {
            await database.query('alter table categories drop constraint test_reject_signup_categories');
        }

        const retry = await request(app).post('/api/signup').send(validSignup);
        assert.equal(retry.status, 201);
    });

    test('creates a user and returns only public user data', async () => {
        // создаёт пользователя и возвращает только его публичные данные
        const response = await request(app)
            .post('/api/signup')
            .send(validSignup);

        assert.equal(response.status, 201);
        assert.equal(response.type, 'application/json');
        assert.equal(typeof response.body.user?.id, 'number');
        assert.deepEqual(response.body, {
            user: {
                id: response.body.user.id,
                email: 'darya@example.test',
                name: 'Дарья',
            },
        });

        const { rows } = await database.query<{
            email: string;
            password_hash: string;
        }>(
            'select email, password_hash from users where id = $1',
            [response.body.user.id],
        );
        const persisted = rows[0];

        assert.ok(persisted);
        assert.equal(persisted.email, 'darya@example.test');
        assert.notEqual(persisted.password_hash, validSignup.password);
        assert.equal(
            await new PasswordService(config).verify(
                validSignup.password,
                persisted.password_hash,
            ),
            true,
        );
    });

    test('rejects invalid signup data with a JSON validation error', async () => {
        // отклоняет некорректные данные регистрации с JSON-ошибкой валидации
        const invalidPayloads = [
            { ...validSignup, name: 'Д' },
            { ...validSignup, email: 'invalid-email' },
            { ...validSignup, password: '12345', passwordRepeat: '12345' },
            { ...validSignup, passwordRepeat: 'another-password' },
        ];

        for (const payload of invalidPayloads) {
            const response = await request(app)
                .post('/api/signup')
                .send(payload);

            assert.equal(response.status, 400);
            assert.equal(response.type, 'application/json');
            assert.equal(response.body.error, true);
            assert.equal(typeof response.body.message, 'string');
            assert.ok(response.body.message.length > 0);
        }

        const { rows } = await database.query<{ count: number }>(
            'select count(*)::integer as count from users',
        );
        assert.equal(rows[0]?.count, 0);
    });

    test('rejects a duplicate normalized email with 409', async () => {
        // отклоняет дубль нормализованного email со статусом 409
        const firstResponse = await request(app)
            .post('/api/signup')
            .send(validSignup);
        assert.equal(firstResponse.status, 201);

        const duplicateResponse = await request(app)
            .post('/api/signup')
            .send({
                ...validSignup,
                email: 'dARYA@eXAMPLE.TEST',
            });

        assert.equal(duplicateResponse.status, 409);
        assert.equal(duplicateResponse.type, 'application/json');
        assert.equal(duplicateResponse.body.error, true);
        assert.match(duplicateResponse.body.message, /already exist/i);
    });
});
