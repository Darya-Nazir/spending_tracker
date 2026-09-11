import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { AppFactory } from '../../../src/http/app.ts';
import { createTestDatabase, TEST_DATABASE_URL } from '../../helpers/db.ts';

/**
 *  /ready отвечает 200 только когда база отвечает на запрос
 *
 * Первому тесту нужен запущенный контейнер: docker compose up -d --wait.
 *
 * Второй тест контейнер не останавливает, а создаёт Database с адресом
 * закрытого порта: прогон не должен менять состояние базы, с которой в это
 * же время может работать запущенный сервер.
 */

// Адрес spending_test, а не spending_dev: с этапа 7 весь прогон работает
// с тестовой базой.
const REACHABLE_URL = TEST_DATABASE_URL;

// Порт 1 не слушает никто: соединение отклоняется сразу, без ожидания таймаута.
const UNREACHABLE_URL = 'postgres://spending:spending@127.0.0.1:1/spending_test';

const buildApp = (moduleUrls: { identity?: string; finance?: string } = {}) => {
    const { config, logger, connections, sink } = createTestDatabase(REACHABLE_URL, moduleUrls);

    return { app: new AppFactory(config, logger, connections).build(), connections, sink };
};

describe('readiness', () => {

    test('GET /ready answers 200 and names both module connections when Postgres is reachable', async () => {
        // GET /ready отвечает 200 и называет оба подключения модулей, когда Postgres доступен
        const { app, connections } = buildApp();

        try {
            const response = await request(app).get('/ready');

            assert.equal(response.status, 200);
            assert.equal(response.type, 'application/json');
            assert.deepEqual(response.body, { db: 'up', identity: 'up', finance: 'up' });
        } finally {
            // Пока соединения открыты, node:test не выходит после
            // последнего теста.
            await connections.close();
        }
    });

    test('GET /ready answers 503 and names the unreachable module', async () => {
        // GET /ready отвечает 503 и называет недоступный модуль
        const { app, connections, sink } = buildApp({ finance: UNREACHABLE_URL });

        try {
            const response = await request(app).get('/ready');

            assert.equal(response.status, 503, 'недоступная база — это 503, а не 500');
            assert.equal(response.type, 'application/json');

            // deepEqual запрещает лишние поля: в ответ не должен попасть ни
            // текст ошибки pg, ни строка подключения — в ней пароль.
            assert.deepEqual(response.body, { db: 'down', identity: 'up', finance: 'down' });
            const records = await sink.records();
            assert.ok(records.some(({ level, msg, db }) => level === 'warn'
                && msg === 'database is not reachable'
                && db === 'finance'));
        } finally {
            await connections.close();
        }
    });
});
