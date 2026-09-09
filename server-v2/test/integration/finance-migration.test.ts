import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { createTestDatabase, TEST_DATABASE_URL, assertTestDatabaseName } from '../helpers/db.ts';

const readMigration = async (name: string) => {
    const sql = await readFile(new URL(`../../migrations/${name}`, import.meta.url), 'utf8');
    const [up, down] = sql.split('-- Down Migration');
    assert.ok(up && down);
    return { up, down };
};

test('migrates historical data, restores legacy access and preserves rows on rollback', async () => {
    // переносит исторические данные, возвращает старые пути и сохраняет строки при откате
    const databaseName = `finance_migration_${process.pid}_test`;
    assertTestDatabaseName(databaseName);
    const admin = createTestDatabase();
    const url = new URL(TEST_DATABASE_URL);
    url.pathname = `/${databaseName}`;
    let isolated: ReturnType<typeof createTestDatabase> | undefined;
    let created = false;
    try {
        await admin.database.query(`create database "${databaseName}"`);
        created = true;
        isolated = createTestDatabase(url.toString());
        const database = isolated.database;
        for (const name of [
            '001_users.sql', '002_categories.sql', '003_operations.sql',
            '004_sessions.sql', '005_users_canonical_email.sql', '006_categories_normalized_title.sql',
        ]) {
            const { up } = await readMigration(name);
            await database.transaction(executor => executor.query(up));
        }
        await database.query("insert into users (email, name, password_hash, initial_balance) values ('history@example.test', 'History', 'hash', 123.45)");
        await database.query("insert into categories (user_id, type, title) values (1, 'expense', 'Еда')");
        await database.query("insert into operations (user_id, category_id, type, amount, date) values (1, 1, 'expense', 23.15, '2026-09-01')");
        const migration = await readMigration('007_finance_accounts.sql');
        await database.transaction(executor => executor.query(migration.up));
        const balance = await database.query('select initial_balance from finance.accounts where user_id = 1');
        assert.equal(balance.rows[0]?.initial_balance, 123.45);
        const columns = await database.query(
            `select data_type, numeric_precision, numeric_scale, is_nullable
               from information_schema.columns
              where table_schema = 'finance' and table_name = 'accounts' and column_name = 'initial_balance'`,
        );
        assert.deepEqual(columns.rows, [{ data_type: 'numeric', numeric_precision: 14, numeric_scale: 2, is_nullable: 'NO' }]);
        const operations = await database.query('select id, user_id, category_id, amount, date from finance.operations');
        assert.deepEqual(operations.rows, [{ id: 1, user_id: 1, category_id: 1, amount: 23.15, date: '2026-09-01' }]);
        const category = await database.query("insert into finance.categories (user_id, type, title) values (1, 'expense', 'Жильё') returning id");
        assert.equal(category.rows[0]?.id, 2);
        const compatibility = await readMigration('008_finance_compatibility.sql');
        await database.transaction(executor => executor.query(compatibility.up));
        const mirrored = await database.query('select initial_balance from users where id = 1');
        assert.equal(mirrored.rows[0]?.initial_balance, 123.45);
        const legacyCategory = await database.query(
            "insert into public.categories (user_id, type, title) values (1, 'income'::public.category_type, 'Зарплата') returning id",
        );
        await database.query(
            "insert into public.operations (user_id, category_id, type, amount, date) values (1, $1, 'income', 10, '2026-09-02')",
            [legacyCategory.rows[0]?.id],
        );
        await database.query('update users set initial_balance = 150 where id = 1');
        const synchronized = await database.query('select initial_balance from finance.accounts where user_id = 1');
        assert.equal(synchronized.rows[0]?.initial_balance, 150);
        await database.transaction(executor => executor.query(compatibility.down));
        const kept = await database.query('select count(*)::integer as count from finance.operations');
        assert.equal(kept.rows[0]?.count, 2);
        await database.query('delete from finance.operations where date = \'2026-09-02\'');
        await database.query('delete from finance.categories where id = $1', [legacyCategory.rows[0]?.id]);

        await database.query('update finance.accounts set initial_balance = 200.50 where user_id = 1');
        await database.transaction(executor => executor.query(migration.down));
        const restored = await database.query('select initial_balance from users where id = 1');
        assert.equal(restored.rows[0]?.initial_balance, 200.5);
        const restoredOperations = await database.query('select id, user_id, category_id, amount, date from operations');
        assert.deepEqual(restoredOperations.rows, operations.rows);
    } finally {
        await isolated?.database.close();
        try {
            if (created) await admin.database.query(`drop database "${databaseName}"`);
        } finally {
            await admin.database.close();
        }
    }
});
