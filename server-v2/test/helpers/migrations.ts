import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { TestContext } from 'node:test';

import type { Database } from '../../src/db/database.ts';
import { assertTestDatabaseName, createTestDatabase, TEST_DATABASE_URL } from './db.ts';

/** Историческая схема с полным слоем совместимости. */
export const MIGRATIONS_THROUGH_009 = [
    '001_users.sql', '002_categories.sql', '003_operations.sql',
    '004_sessions.sql', '005_users_canonical_email.sql', '006_categories_normalized_title.sql',
    '007_finance_accounts.sql', '008_finance_compatibility.sql', '009_identity_schema.sql',
] as const;

/** Применяет выбранное направление SQL-миграции в транзакции. */
export const applyMigration = async (
    database: Database,
    name: string,
    direction: 'up' | 'down' = 'up',
): Promise<void> => {
    const sql = await readFile(new URL(`../../migrations/${name}`, import.meta.url), 'utf8');
    const [up, down] = sql.split('-- Down Migration');
    assert.ok(up && down, `${name} must contain up and down migrations`);
    await database.transaction(executor => executor.query(direction === 'up' ? up : down));
};

/** Создаёт отдельную БД на тест и регистрирует её удаление при любом исходе. */
export const createMigrationDatabase = async (
    t: TestContext,
    migrations: readonly string[],
): Promise<Database> => {
    const databaseName = `migration_${randomUUID().replaceAll('-', '')}_test`;
    assertTestDatabaseName(databaseName);
    const admin = createTestDatabase();
    const url = new URL(TEST_DATABASE_URL);
    url.pathname = `/${databaseName}`;
    let isolated: ReturnType<typeof createTestDatabase> | undefined;
    let created = false;

    t.after(async () => {
        try {
            await isolated?.database.close();
        } finally {
            try {
                if (created) {
                    await admin.database.query(`drop database "${databaseName}"`);
                }
            } finally {
                await admin.database.close();
            }
        }
    });

    await admin.database.query(`create database "${databaseName}"`);
    created = true;
    isolated = createTestDatabase(url.toString());
    for (const name of migrations) {
        await applyMigration(isolated.database, name);
    }
    return isolated.database;
};
