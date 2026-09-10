import assert from 'node:assert/strict';
import { test } from 'node:test';

import { useTestDatabase } from '../helpers/db.ts';

const { database } = useTestDatabase();

test('keeps application tables and types in their owning schemas', async () => {
    // хранит прикладные таблицы и типы в схемах их модулей
    const { rows } = await database.query(
        `select to_regclass('public.users') as users,
                to_regclass('public.categories') as categories,
                to_regclass('public.operations') as operations,
                to_regtype('public.category_type') as category_type`,
    );
    assert.deepEqual(rows, [{ users: null, categories: null, operations: null, category_type: null }]);
});

test('keeps cross-module compatibility triggers and functions out of the schema', async () => {
    // сохраняет схему свободной от межмодульных триггеров и функций совместимости
    const triggers = await database.query(
        `select tgname from pg_trigger
          where tgrelid in ('identity.users'::regclass, 'finance.accounts'::regclass)
            and tgname in ('users_account_insert', 'users_account_delete',
                           'users_initial_balance_update', 'accounts_initial_balance_sync')`,
    );
    assert.deepEqual(triggers.rows, []);
    const functions = await database.query(
        `select to_regprocedure('public.sync_account_initial_balance()') as account_sync,
                to_regprocedure('public.delete_account_of_user()') as account_delete,
                to_regprocedure('finance.sync_user_initial_balance()') as user_sync`,
    );
    assert.deepEqual(functions.rows, [{ account_sync: null, account_delete: null, user_sync: null }]);
});
