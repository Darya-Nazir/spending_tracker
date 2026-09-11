import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { assertTestDatabaseName, useTestDatabase } from '../../helpers/db.ts';

const { database, connections } = useTestDatabase();

const assertPermissionDenied = (attempt: Promise<unknown>): Promise<void> => assert.rejects(
    attempt,
    (error: unknown) => {
        assert.equal((error as { code?: string }).code, '42501');
        return true;
    },
);

test('lets each module role write its own schema', async () => {
    // разрешает каждой роли модуля писать в свою схему
    const { rows } = await connections.identity.query<{ id: number }>(
        `insert into identity.users (email, name, password_hash)
         values ($1, 'Role User', 'hash')
         returning id`,
        [`role-${randomUUID()}@example.test`],
    );
    const userId = rows[0]?.id;
    assert.ok(userId);

    await connections.finance.query('insert into finance.accounts (user_id) values ($1)', [userId]);

    const accounts = await connections.finance.query(
        'select user_id, status from finance.accounts where user_id = $1', [userId],
    );
    assert.deepEqual(accounts.rows, [{ user_id: userId, status: 'pending' }]);
});

test('refuses each module role access to the neighbouring schema', async () => {
    // отклоняет обращение каждой роли модуля к соседней схеме
    await assertPermissionDenied(connections.identity.query('select 1 from finance.accounts'));
    await assertPermissionDenied(connections.finance.query('select 1 from identity.users'));
    await assertPermissionDenied(connections.finance.query(
        "insert into identity.users (email, name, password_hash) values ('x@example.test', 'X', 'hash')",
    ));
});

test('keeps the migration history while clearing application tables', async () => {
    // сохраняет историю миграций, очищая прикладные таблицы
    const migrations = await database.query<{ count: number }>(
        'select count(*)::integer as count from public.pgmigrations',
    );
    assert.ok((migrations.rows[0]?.count ?? 0) > 0, 'история миграций пережила очистку');

    const users = await database.query<{ count: number }>(
        'select count(*)::integer as count from identity.users',
    );
    assert.equal(users.rows[0]?.count, 0);
});

test('refuses to clear a database whose name does not end with _test', () => {
    // отказывается очищать базу, имя которой не оканчивается на _test
    assert.throws(() => assertTestDatabaseName('spending_dev'), /spending_dev/);
    assertTestDatabaseName('spending_test');
});
