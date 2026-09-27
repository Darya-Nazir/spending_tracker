import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import { Client } from 'pg';

import { CategoryRepository } from '../../../src/modules/categories/category.repository.ts';
import { assertTestDatabaseName, TEST_DATABASE_URL } from '../../helpers/db.ts';

const dir = fileURLToPath(new URL('../../../migrations/old', import.meta.url));
const logger = { info() {}, warn() {}, error() {}, debug() {} };

// При обновлении count задаёт конечный номер миграции: эти тесты проверяют этап 014.
const migrate = (client: Client, count = 14, direction: 'up' | 'down' = 'up') => runner({
    dbClient: client, dir, migrationsTable: 'pgmigrations', direction, count,
    timestamp: direction === 'up', singleTransaction: true, checkOrder: true, logger,
});

/** Каждый сценарий получает отдельную БД; очистка выполняется и при ошибке теста. */
const createDatabase = async (t: TestContext, count: number): Promise<Client> => {
    const name = `restore_login_${randomUUID().replaceAll('-', '')}_test`;
    assertTestDatabaseName(name);
    const admin = new Client({ connectionString: TEST_DATABASE_URL });
    const url = new URL(TEST_DATABASE_URL);
    url.pathname = `/${name}`;
    const client = new Client({ connectionString: url.toString() });
    let created = false;
    t.after(async () => {
        try {
            await client.end();
            if (created) await admin.query(`DROP DATABASE "${name}"`);
        } finally {
            await admin.end();
        }
    });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    await client.connect();
    await migrate(client, count);
    return client;
};

/** Сравниваем контракт схемы по именам; физический порядок колонок допускает различия. */
const schema = async (client: Client) => {
    const queries = {
        schemas: `SELECT nspname FROM pg_namespace
            WHERE nspname IN ('public', 'identity', 'finance') ORDER BY nspname`,
        tables: `SELECT table_schema, table_name, table_type FROM information_schema.tables
            WHERE table_schema IN ('public', 'identity', 'finance') AND table_name <> 'pgmigrations'
            ORDER BY table_schema, table_name`,
        columns: `SELECT table_schema, table_name, column_name, data_type, udt_schema, udt_name,
                is_nullable, column_default, numeric_precision, numeric_scale, character_maximum_length,
                is_identity, identity_generation
            FROM information_schema.columns
            WHERE table_schema IN ('public', 'identity', 'finance') AND table_name <> 'pgmigrations'
            ORDER BY table_schema, table_name, column_name`,
        constraints: `SELECT n.nspname, t.relname, c.conname, c.contype, pg_get_constraintdef(c.oid) AS definition
            FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname IN ('public', 'identity', 'finance') AND t.relname <> 'pgmigrations'
            ORDER BY n.nspname, t.relname, c.conname`,
        indexes: `SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes
            WHERE schemaname IN ('public', 'identity', 'finance') AND tablename <> 'pgmigrations'
            ORDER BY schemaname, tablename, indexname`,
        enums: `SELECT n.nspname, t.typname, e.enumlabel, e.enumsortorder FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname IN ('public', 'identity', 'finance') ORDER BY n.nspname, t.typname, e.enumsortorder`,
        sequences: `SELECT schemaname, sequencename, data_type::text, start_value, min_value,
                max_value, increment_by, cycle, cache_size FROM pg_sequences
            WHERE schemaname IN ('public', 'identity', 'finance') AND sequencename <> 'pgmigrations_id_seq'
            ORDER BY schemaname, sequencename`,
        functions: `SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) AS definition
            FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname IN ('public', 'identity', 'finance') ORDER BY n.nspname, p.proname`,
        triggers: `SELECT n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid) AS definition
            FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname IN ('public', 'identity', 'finance') AND NOT t.tgisinternal
            ORDER BY n.nspname, c.relname, t.tgname`,
    };
    const result: Record<string, unknown> = {};
    for (const [name, sql] of Object.entries(queries)) result[name] = (await client.query(sql)).rows;
    return result;
};

const history = async (client: Client) => (await client.query(
    'SELECT id, name, run_on FROM public.pgmigrations ORDER BY id',
)).rows;

const data = async (client: Client, historical: boolean) => {
    const result: Record<string, unknown> = {};
    const users = historical
        ? `SELECT to_jsonb(u) || jsonb_build_object('initial_balance', coalesce(a.initial_balance, 0)) AS row
            FROM identity.users u LEFT JOIN finance.accounts a ON a.user_id = u.id ORDER BY u.id`
        : 'SELECT to_jsonb(u) AS row FROM public.users u ORDER BY u.id';
    result.users = (await client.query(users)).rows;
    for (const table of ['sessions', 'categories', 'operations']) {
        const namespace = historical ? (table === 'sessions' ? 'identity' : 'finance') : 'public';
        result[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM ${namespace}.${table} t ORDER BY id`)).rows;
    }
    return result;
};

test('fresh migrations restore the login schema and retain migration history', async t => {
    // миграции с чистой базы восстанавливают схему входа и сохраняют историю миграций
    const baseline = await createDatabase(t, 6);
    const restored = await createDatabase(t, 14);
    assert.deepEqual(await schema(restored), await schema(baseline));
    const applied = await history(restored);
    assert.equal(applied.length, 14);
    assert.equal(applied.at(-1)?.name, '014_restore_login_schema');
    assert.deepEqual(await migrate(restored), []);
    assert.deepEqual(await history(restored), applied);
});

test('restoration preserves business data, balances, sequences and user deletion cascades', async t => {
    // восстановление сохраняет бизнес-данные, балансы, последовательности и каскадное удаление пользователя
    const client = await createDatabase(t, 6);
    await client.query(`
        INSERT INTO users (email, name, password_hash, initial_balance) VALUES
            ('ready@example.test', 'Ready', 'hash-ready', 123.45),
            ('failed@example.test', 'Failed', 'hash-failed', -42.10),
            ('pending@example.test', 'Pending', 'hash-pending', 0);
        INSERT INTO sessions (user_id, token_hash, expires_at, device, revoked_at) VALUES
            (1, repeat('a', 64), '2027-01-01', 'phone', '2026-09-01'),
            (1, repeat('b', 64), '2027-02-01', 'laptop', NULL);
        UPDATE sessions SET replaced_by = 2 WHERE id = 1;
        INSERT INTO categories (user_id, type, title, title_normalized, is_default) VALUES
            (1, 'expense', 'Food', 'food', true), (2, 'income', 'Salary', 'salary', false);
        INSERT INTO operations (user_id, category_id, type, amount, date, comment) VALUES
            (1, 1, 'expense', 12.34, '2026-09-08', 'Lunch'),
            (2, 2, 'income', 987.65, '2026-09-09', 'Pay');
    `);
    await migrate(client, 13);
    await client.query(`
        UPDATE finance.accounts SET status = 'ready' WHERE user_id = 1;
        UPDATE finance.accounts SET status = 'failed', status_reason = 'fixture failure' WHERE user_id = 2;
        UPDATE identity.outbox SET failed_at = current_timestamp, last_error = 'fixture failure' WHERE user_id = 2;
        INSERT INTO identity.users (email, name, password_hash) VALUES ('new@example.test', 'New', 'hash-new');
        INSERT INTO finance.categories (user_id, type, title) VALUES (1, 'income', 'Gift');
        INSERT INTO finance.operations (user_id, category_id, type, amount, date) VALUES
            (1, 3, 'income', 50, '2026-09-14');
    `);
    const before = await data(client, true);
    const previousHistory = await history(client);
    await migrate(client);
    assert.deepEqual(await data(client, false), before);
    assert.deepEqual((await history(client)).slice(0, 13), previousHistory);
    assert.equal((await client.query('SELECT initial_balance FROM users WHERE id = 4')).rows[0].initial_balance, 0);
    assert.equal((await client.query(`INSERT INTO users (email, name, password_hash)
        VALUES ('next@example.test', 'Next', 'hash-next') RETURNING id`)).rows[0].id, 5);
    assert.equal((await client.query(`INSERT INTO categories (user_id, type, title)
        VALUES (5, 'expense', 'Next') RETURNING id`)).rows[0].id, 4);
    assert.equal((await client.query(`INSERT INTO operations (user_id, category_id, type, amount, date)
        VALUES (5, 4, 'expense', 1, '2026-09-14') RETURNING id`)).rows[0].id, 4);
    assert.equal((await client.query(`INSERT INTO sessions (user_id, token_hash, expires_at, device)
        VALUES (5, repeat('c', 64), '2027-01-01', 'next') RETURNING id`)).rows[0].id, 3);
    await client.query('DELETE FROM users WHERE id = 1');
    for (const table of ['sessions', 'categories', 'operations']) {
        assert.equal((await client.query(`SELECT * FROM ${table} WHERE user_id = 1`)).rowCount, 0);
    }
    assert.equal((await client.query('SELECT * FROM operations WHERE user_id = 2')).rowCount, 1);
});

test('orphan accounts abort restoration with their user IDs and preserve the database', async t => {
    // аккаунты без пользователей прерывают восстановление с указанием ID и сохраняют базу
    const client = await createDatabase(t, 13);
    await client.query('INSERT INTO finance.accounts (user_id, initial_balance) VALUES (999, 12.34)');
    const before = await schema(client);
    const applied = await history(client);
    await assert.rejects(migrate(client), /Restore identity users.*999/);
    assert.deepEqual(await schema(client), before);
    assert.deepEqual(await history(client), applied);
    assert.equal((await client.query('SELECT initial_balance FROM finance.accounts WHERE user_id = 999')).rows[0].initial_balance, 12.34);
});

test('a schema collision rolls back all preceding restoration changes', async t => {
    // конфликт схемы откатывает все предшествующие изменения восстановления
    const client = await createDatabase(t, 13);
    await client.query('CREATE TABLE public.users (marker text)');
    const before = await schema(client);
    const applied = await history(client);
    await assert.rejects(migrate(client), /already exists/);
    assert.deepEqual(await schema(client), before);
    assert.deepEqual(await history(client), applied);
});

test('reversing restoration requires a backup and preserves the restored schema', async t => {
    // обратный откат восстановления требует резервную копию и сохраняет восстановленную схему
    const client = await createDatabase(t, 14);
    const before = await schema(client);
    const applied = await history(client);
    await assert.rejects(migrate(client, 1, 'down'), /Restore the pre-014 database backup/);
    assert.deepEqual(await schema(client), before);
    assert.deepEqual(await history(client), applied);
});

test('migration 016 preserves service-normalized data and matches a fresh database', async t => {
    // миграция 016 сохраняет нормализованные сервисом данные и даёт схему как у новой базы
    const client = await createDatabase(t, 15);
    const fresh = await createDatabase(t, 16);
    await client.query(`INSERT INTO users (email, name, password_hash)
        VALUES ('categories@example.test', 'Categories', 'hash')`);
    const categories = new CategoryRepository(client);
    await categories.seedDefaults(1);
    await categories.create(1, 'expense', 'Кофе Café İ');
    await client.query(`INSERT INTO operations (user_id, category_id, type, amount, date)
        VALUES (1, 1, 'expense', 12.34, '2026-09-16')`);
    const before = await data(client, false);
    const previousHistory = await history(client);

    await migrate(client, 16);

    assert.deepEqual(await schema(client), await schema(fresh));
    assert.deepEqual(await data(client, false), before);
    const applied = await history(client);
    assert.deepEqual(applied.slice(0, 15), previousHistory);
    assert.equal(applied.at(-1)?.name, '016_categories_normalized_title_required');
    assert.deepEqual(await migrate(client, 16), []);
    assert.deepEqual(await history(client), applied);
    await migrate(client, 1, 'down');
    await migrate(client, 16);
    assert.deepEqual(await schema(client), await schema(fresh));
    assert.deepEqual(await data(client, false), before);
});
