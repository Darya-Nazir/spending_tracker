import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import { Client } from 'pg';

import { assertTestDatabaseName, TEST_DATABASE_URL } from '../helpers/db.ts';

const dir = fileURLToPath(new URL('../../migrations', import.meta.url));
const logger = { info() {}, warn() {}, error() {}, debug() {} };

const migrate = (client: Client, count = Infinity, direction: 'up' | 'down' = 'up') => runner({
    dbClient: client, dir, migrationsTable: 'pgmigrations', direction, count,
    singleTransaction: true, checkOrder: true, logger,
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
            if (created) await admin.query(`drop database "${name}"`);
        } finally {
            await admin.end();
        }
    });
    await admin.connect();
    await admin.query(`create database "${name}"`);
    created = true;
    await client.connect();
    await migrate(client, count);
    return client;
};

/** Сравниваем контракт схемы по именам; физический порядок колонок допускает различия. */
const schema = async (client: Client) => {
    const queries = {
        schemas: `select nspname from pg_namespace
            where nspname in ('public', 'identity', 'finance') order by nspname`,
        tables: `select table_schema, table_name, table_type from information_schema.tables
            where table_schema in ('public', 'identity', 'finance') and table_name <> 'pgmigrations'
            order by table_schema, table_name`,
        columns: `select table_schema, table_name, column_name, data_type, udt_schema, udt_name,
                is_nullable, column_default, numeric_precision, numeric_scale, character_maximum_length,
                is_identity, identity_generation
            from information_schema.columns
            where table_schema in ('public', 'identity', 'finance') and table_name <> 'pgmigrations'
            order by table_schema, table_name, column_name`,
        constraints: `select n.nspname, t.relname, c.conname, c.contype, pg_get_constraintdef(c.oid) as definition
            from pg_constraint c join pg_class t on t.oid = c.conrelid
            join pg_namespace n on n.oid = t.relnamespace
            where n.nspname in ('public', 'identity', 'finance') and t.relname <> 'pgmigrations'
            order by n.nspname, t.relname, c.conname`,
        indexes: `select schemaname, tablename, indexname, indexdef from pg_indexes
            where schemaname in ('public', 'identity', 'finance') and tablename <> 'pgmigrations'
            order by schemaname, tablename, indexname`,
        enums: `select n.nspname, t.typname, e.enumlabel, e.enumsortorder from pg_enum e
            join pg_type t on t.oid = e.enumtypid join pg_namespace n on n.oid = t.typnamespace
            where n.nspname in ('public', 'identity', 'finance') order by n.nspname, t.typname, e.enumsortorder`,
        sequences: `select schemaname, sequencename, data_type::text, start_value, min_value,
                max_value, increment_by, cycle, cache_size from pg_sequences
            where schemaname in ('public', 'identity', 'finance') and sequencename <> 'pgmigrations_id_seq'
            order by schemaname, sequencename`,
        functions: `select n.nspname, p.proname, pg_get_functiondef(p.oid) as definition
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public', 'identity', 'finance') order by n.nspname, p.proname`,
        triggers: `select n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid) as definition
            from pg_trigger t join pg_class c on c.oid = t.tgrelid
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname in ('public', 'identity', 'finance') and not t.tgisinternal
            order by n.nspname, c.relname, t.tgname`,
    };
    const result: Record<string, unknown> = {};
    for (const [name, sql] of Object.entries(queries)) result[name] = (await client.query(sql)).rows;
    return result;
};

const history = async (client: Client) => (await client.query(
    'select id, name, run_on from public.pgmigrations order by id',
)).rows;

const data = async (client: Client, historical: boolean) => {
    const result: Record<string, unknown> = {};
    const users = historical
        ? `select to_jsonb(u) || jsonb_build_object('initial_balance', coalesce(a.initial_balance, 0)) as row
            from identity.users u left join finance.accounts a on a.user_id = u.id order by u.id`
        : 'select to_jsonb(u) as row from public.users u order by u.id';
    result.users = (await client.query(users)).rows;
    for (const table of ['sessions', 'categories', 'operations']) {
        const namespace = historical ? (table === 'sessions' ? 'identity' : 'finance') : 'public';
        result[table] = (await client.query(`select to_jsonb(t) as row from ${namespace}.${table} t order by id`)).rows;
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
        insert into users (email, name, password_hash, initial_balance) values
            ('ready@example.test', 'Ready', 'hash-ready', 123.45),
            ('failed@example.test', 'Failed', 'hash-failed', -42.10),
            ('pending@example.test', 'Pending', 'hash-pending', 0);
        insert into sessions (user_id, token_hash, expires_at, device, revoked_at) values
            (1, repeat('a', 64), '2027-01-01', 'phone', '2026-09-01'),
            (1, repeat('b', 64), '2027-02-01', 'laptop', null);
        update sessions set replaced_by = 2 where id = 1;
        insert into categories (user_id, type, title, title_normalized, is_default) values
            (1, 'expense', 'Food', 'food', true), (2, 'income', 'Salary', 'salary', false);
        insert into operations (user_id, category_id, type, amount, date, comment) values
            (1, 1, 'expense', 12.34, '2026-09-08', 'Lunch'),
            (2, 2, 'income', 987.65, '2026-09-09', 'Pay');
    `);
    await migrate(client, 7);
    await client.query(`
        update finance.accounts set status = 'ready' where user_id = 1;
        update finance.accounts set status = 'failed', status_reason = 'fixture failure' where user_id = 2;
        update identity.outbox set failed_at = current_timestamp, last_error = 'fixture failure' where user_id = 2;
        insert into identity.users (email, name, password_hash) values ('new@example.test', 'New', 'hash-new');
        insert into finance.categories (user_id, type, title) values (1, 'income', 'Gift');
        insert into finance.operations (user_id, category_id, type, amount, date) values
            (1, 3, 'income', 50, '2026-09-14');
    `);
    const before = await data(client, true);
    const previousHistory = await history(client);
    await migrate(client);
    assert.deepEqual(await data(client, false), before);
    assert.deepEqual((await history(client)).slice(0, 13), previousHistory);
    assert.equal((await client.query('select initial_balance from users where id = 4')).rows[0].initial_balance, 0);
    assert.equal((await client.query(`insert into users (email, name, password_hash)
        values ('next@example.test', 'Next', 'hash-next') returning id`)).rows[0].id, 5);
    assert.equal((await client.query(`insert into categories (user_id, type, title)
        values (5, 'expense', 'Next') returning id`)).rows[0].id, 4);
    assert.equal((await client.query(`insert into operations (user_id, category_id, type, amount, date)
        values (5, 4, 'expense', 1, '2026-09-14') returning id`)).rows[0].id, 4);
    assert.equal((await client.query(`insert into sessions (user_id, token_hash, expires_at, device)
        values (5, repeat('c', 64), '2027-01-01', 'next') returning id`)).rows[0].id, 3);
    await client.query('delete from users where id = 1');
    for (const table of ['sessions', 'categories', 'operations']) {
        assert.equal((await client.query(`select * from ${table} where user_id = 1`)).rowCount, 0);
    }
    assert.equal((await client.query('select * from operations where user_id = 2')).rowCount, 1);
});

test('orphan accounts abort restoration with their user IDs and preserve the database', async t => {
    // аккаунты без пользователей прерывают восстановление с указанием ID и сохраняют базу
    const client = await createDatabase(t, 13);
    await client.query('insert into finance.accounts (user_id, initial_balance) values (999, 12.34)');
    const before = await schema(client);
    const applied = await history(client);
    await assert.rejects(migrate(client), /Restore identity users.*999/);
    assert.deepEqual(await schema(client), before);
    assert.deepEqual(await history(client), applied);
    assert.equal((await client.query('select initial_balance from finance.accounts where user_id = 999')).rows[0].initial_balance, 12.34);
});

test('a schema collision rolls back all preceding restoration changes', async t => {
    // конфликт схемы откатывает все предшествующие изменения восстановления
    const client = await createDatabase(t, 13);
    await client.query('create table public.users (marker text)');
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
