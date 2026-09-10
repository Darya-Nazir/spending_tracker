import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/db.ts';

const REACHABLE_URL = TEST_DATABASE_URL;

describe('database connection logging', () => {

    test('logs the first real connection and does not log SQL', async () => {
        // Логирует первое реальное подключение и не логирует SQL.
        const { database, sink } = createTestDatabase(REACHABLE_URL);

        try {
            assert.equal(await database.isReachable(), true);
            assert.equal(await database.isReachable(), true);

            const records = await sink.records();
            assert.equal(
                records.filter(({ msg }) => msg === 'database connected').length,
                1,
                'первое физическое соединение с PostgreSQL записано один раз',
            );
            assert.equal(
                records.some(({ msg }) => msg === 'sql'),
                false,
                'SQL-запросы не пишет логгер приложения',
            );
        } finally {
            await database.close();
        }
    });
});
