import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';

import { Config } from '../../../src/config/config.ts';
import { AppFactory } from '../../../src/http/app.ts';
import { TokenService } from '../../../src/modules/auth/token.service.ts';
import { CategoryRepository } from '../../../src/modules/categories/category.repository.ts';
import { useTestApp } from '../../helpers/app.ts';
import { bearerAuth } from '../../helpers/auth.ts';
import { createUser } from '../../helpers/factories.ts';

// Таймзона процесса отличается от APP_TZ; node:test изолирует файл в своём процессе.
process.env.TZ = 'UTC';

const { app, config, database, logger } = useTestApp();
const tokens = new TokenService(config);
const auth = (userId: number) => bearerAuth(tokens.issueTokenPair(userId).accessToken);

const periodApp = new AppFactory(Config.load({
    NODE_ENV: 'test',
    DATABASE_URL: config.databaseUrl,
    JWT_ACCESS_SECRET: config.jwt.accessSecret,
    JWT_REFRESH_SECRET: config.jwt.refreshSecret,
    APP_TZ: 'Asia/Almaty',
}), logger, database).build();

const addDatedOperations = async (userId: number, dates: string[]) => {
    await new CategoryRepository(database).seedDefaults(userId);
    const { rows } = await database.query<{ id: number; date: string }>(
        `insert into operations (user_id, category_id, type, amount, date)
         select c.user_id, c.id, c.type, 10, d.date
           from categories c cross join unnest($2::date[]) as d(date)
          where c.user_id = $1 and c.type = 'expense' and c.is_default
         returning id, date`,
        [userId, dates],
    );
    assert.equal(rows.length, dates.length);
    return rows;
};

describe('GET /api/operations', () => {
    test('returns an empty array when there are no operations', async () => {
        // возвращает пустой массив при отсутствии операций
        const user = await createUser(database);
        const response = await request(app).get('/api/operations?period=all').set(auth(user.id));

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, []);
    });

    test('lists only the caller operations with category titles in descending date and ID order', async () => {
        // возвращает только операции вызывающего с названиями категорий по убыванию даты и ID
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

        const other = await createUser(database);
        await addDatedOperations(other.id, ['2026-02-12']);

        for (const query of ['', '?period=all&type=income']) {
            const response = await request(app).get(`/api/operations${query}`).set(auth(user.id));

            assert.equal(response.status, 200);
            assert.deepEqual(response.body, [saved[1], saved[0], saved[2]]);
        }
    });

    // Сохраняем скользящие периоды старого API: 7 дней, месяц и год назад от сегодня.
    for (const [period, from, before] of [
        ['today', '2024-03-31', '2024-03-30'],
        ['week', '2024-03-24', '2024-03-23'],
        ['month', '2024-02-29', '2024-02-28'],
        ['year', '2023-03-31', '2023-03-30'],
    ] as const) {
        test(`filters ${period} by inclusive boundaries in the application timezone`, async (t) => {
            // фильтрует указанный период по включительным границам в таймзоне приложения
            // В UTC ещё 30 марта, в Asia/Almaty уже 31 марта.
            t.mock.timers.enable({ apis: ['Date'], now: new Date('2024-03-30T22:30:00Z') });
            const user = await createUser(database);
            const today = '2024-03-31';
            await addDatedOperations(user.id, [...new Set([before, from, today, '2024-04-01'])]);

            const response = await request(periodApp)
                .get(`/api/operations?period=${period}&type=income`).set(auth(user.id));

            assert.equal(response.status, 200);
            assert.deepEqual(response.body.map(({ date }: { date: string }) => date), [...new Set([today, from])]);
        });
    }

    test('filters intervals inclusively, allows a single day and returns only the caller operations', async () => {
        // фильтрует интервалы включительно, допускает один день и возвращает только операции вызывающего
        const user = await createUser(database);
        const saved = await addDatedOperations(user.id, ['2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02']);
        const other = await createUser(database);
        await addDatedOperations(other.id, ['2024-02-29', '2024-03-01']);

        for (const dateTo of ['2024-03-01', '2024-02-29']) {
            const response = await request(app).get('/api/operations')
                .query({ period: 'interval', dateFrom: '2024-02-29', dateTo }).set(auth(user.id));

            assert.equal(response.status, 200);
            const expected = saved.filter(({ date }) => date === '2024-02-29' || date === dateTo);
            assert.deepEqual(
                response.body.map(({ id }: { id: number }) => id).sort((a: number, b: number) => a - b),
                expected.map(({ id }) => id).sort((a, b) => a - b),
            );
        }
    });

    test('returns JSON 400 for an unknown period or an invalid interval', async () => {
        // возвращает JSON 400 для неизвестного периода или некорректного интервала
        const user = await createUser(database);
        for (const query of [
            { period: 'unknown' },
            { period: 'interval', dateFrom: '2024-03-02', dateTo: '2024-03-01' },
            { period: 'interval', dateFrom: '2024-03-01' },
            { period: 'interval', dateTo: '2024-03-01' },
            { period: 'interval', dateFrom: '2024-02-30', dateTo: '2024-03-01' },
            { period: 'interval', dateFrom: 'invalid', dateTo: '2024-03-01' },
        ]) {
            const response = await request(app).get('/api/operations').query(query).set(auth(user.id));

            assert.equal(response.status, 400, JSON.stringify(query));
            assert.equal(response.type, 'application/json');
            assert.equal(response.body.error, true);
            assert.equal(typeof response.body.message, 'string');
            assert.ok(response.body.message.trim());
        }
    });
});
