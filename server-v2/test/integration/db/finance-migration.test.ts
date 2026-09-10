import assert from 'node:assert/strict';
import { describe, test, type TestContext } from 'node:test';

import type { Database } from '../../../src/db/database.ts';
import { applyMigration, createMigrationDatabase, MIGRATIONS_THROUGH_009 } from '../../helpers/migrations.ts';

const BASE_MIGRATIONS = MIGRATIONS_THROUGH_009.slice(0, 6);
const FINANCE = '007_finance_accounts.sql';
const COMPATIBILITY = '008_finance_compatibility.sql';
const IDENTITY = '009_identity_schema.sql';
const REMOVE_COMPATIBILITY = '010_remove_finance_compatibility.sql';
const HISTORICAL_OPERATION = {
    id: 1, user_id: 1, category_id: 1, amount: 23.15, date: '2026-09-01',
};

/** Загружает данные версии 006 и доводит схему до исходного состояния сценария. */
const prepareHistoricalDatabase = async (t: TestContext, migrations: readonly string[] = []) => {
    const database = await createMigrationDatabase(t, BASE_MIGRATIONS);
    await database.query(
        `insert into public.users (email, name, password_hash, initial_balance)
         values ('history@example.test', 'History', 'hash', 123.45)`,
    );
    await database.query(
        "insert into public.categories (user_id, type, title) values (1, 'expense', 'Еда')",
    );
    await database.query(
        `insert into public.operations (user_id, category_id, type, amount, date)
         values (1, 1, 'expense', 23.15, '2026-09-01')`,
    );
    for (const name of migrations) {
        await applyMigration(database, name);
    }
    return database;
};

/** Записывает новые финансовые данные через представления совместимости. */
const createLegacyIncome = async (database: Database): Promise<void> => {
    const category = await database.query<{ id: number }>(
        `insert into public.categories (user_id, type, title)
         values (1, 'income'::public.category_type, 'Зарплата') returning id`,
    );
    assert.ok(category.rows[0]);
    await database.query(
        `insert into public.operations (user_id, category_id, type, amount, date)
         values (1, $1, 'income', 10, '2026-09-02')`,
        [category.rows[0].id],
    );
};

/** Снимок всех исторических строк для проверки полного цикла миграций. */
const readLegacyData = async (database: Database) => {
    const results = await Promise.all([
        database.query('select * from public.users order by id'),
        database.query('select * from public.categories order by id'),
        database.query('select * from public.operations order by id'),
    ]);
    return results.map(result => result.rows);
};

/** Снимок данных модулей; баланс читается из финансового аккаунта. */
const readModuleData = async (database: Database) => {
    const results = await Promise.all([
        database.query('select id, email, name, password_hash, created_at from identity.users order by id'),
        database.query('select * from identity.sessions order by id'),
        database.query('select * from finance.accounts order by user_id'),
        database.query('select * from finance.categories order by id'),
        database.query('select * from finance.operations order by id'),
    ]);
    return results.map(result => result.rows);
};

describe('007 finance accounts', () => {
    test('moves historical balances and operations into finance with the required money type', async (t) => {
        // переносит исторические балансы и операции в finance с требуемым денежным типом
        const database = await prepareHistoricalDatabase(t);

        await applyMigration(database, FINANCE);

        const balance = await database.query('select initial_balance from finance.accounts where user_id = 1');
        assert.equal(balance.rows[0]?.initial_balance, 123.45);
        const columns = await database.query(
            `select data_type, numeric_precision, numeric_scale, is_nullable
               from information_schema.columns
              where table_schema = 'finance' and table_name = 'accounts' and column_name = 'initial_balance'`,
        );
        assert.deepEqual(columns.rows, [{ data_type: 'numeric', numeric_precision: 14, numeric_scale: 2, is_nullable: 'NO' }]);
        const operations = await database.query('select id, user_id, category_id, amount, date from finance.operations');
        assert.deepEqual(operations.rows, [HISTORICAL_OPERATION]);
    });

    test('continues the category ID sequence after moving the table', async (t) => {
        // продолжает последовательность ID категорий после переноса таблицы
        const database = await prepareHistoricalDatabase(t);

        await applyMigration(database, FINANCE);

        const category = await database.query(
            "insert into finance.categories (user_id, type, title) values (1, 'expense', 'Жильё') returning id",
        );
        assert.equal(category.rows[0]?.id, 2);
    });

    test('restores the updated balance and historical operations on rollback', async (t) => {
        // восстанавливает обновлённый баланс и исторические операции при откате
        const database = await prepareHistoricalDatabase(t, [FINANCE]);
        await database.query('update finance.accounts set initial_balance = 200.50 where user_id = 1');

        await applyMigration(database, FINANCE, 'down');

        const users = await database.query('select initial_balance from public.users where id = 1');
        assert.equal(users.rows[0]?.initial_balance, 200.5);
        const operations = await database.query('select id, user_id, category_id, amount, date from public.operations');
        assert.deepEqual(operations.rows, [HISTORICAL_OPERATION]);
    });
});

describe('008 finance compatibility', () => {
    test('restores legacy writes and synchronizes the starting balance', async (t) => {
        // восстанавливает запись через старые пути и синхронизирует стартовый баланс
        const database = await prepareHistoricalDatabase(t, [FINANCE]);

        await applyMigration(database, COMPATIBILITY);

        const users = await database.query('select initial_balance from public.users where id = 1');
        assert.equal(users.rows[0]?.initial_balance, 123.45);
        await createLegacyIncome(database);
        const operations = await database.query('select amount from finance.operations order by id');
        assert.deepEqual(operations.rows, [{ amount: 23.15 }, { amount: 10 }]);
        await database.query('update public.users set initial_balance = 150 where id = 1');
        const accounts = await database.query('select initial_balance from finance.accounts where user_id = 1');
        assert.equal(accounts.rows[0]?.initial_balance, 150);
    });

    test('preserves historical and newly written financial data on rollback', async (t) => {
        // сохраняет исторические и вновь записанные финансовые данные при откате
        const database = await prepareHistoricalDatabase(t, [FINANCE, COMPATIBILITY]);
        await createLegacyIncome(database);
        await database.query('update public.users set initial_balance = 150 where id = 1');

        await applyMigration(database, COMPATIBILITY, 'down');

        const operations = await database.query('select amount from finance.operations order by id');
        assert.deepEqual(operations.rows, [{ amount: 23.15 }, { amount: 10 }]);
        const categories = await database.query('select title from finance.categories order by id');
        assert.deepEqual(categories.rows, [{ title: 'Еда' }, { title: 'Зарплата' }]);
        const accounts = await database.query('select initial_balance from finance.accounts where user_id = 1');
        assert.equal(accounts.rows[0]?.initial_balance, 150);
    });
});

describe('009 identity schema', () => {
    test('moves historical users into identity with their mirrored balances', async (t) => {
        // переносит исторических пользователей в identity вместе с зеркальными балансами
        const database = await prepareHistoricalDatabase(t, [FINANCE, COMPATIBILITY]);
        await database.query('update public.users set initial_balance = 150 where id = 1');

        await applyMigration(database, IDENTITY);

        const users = await database.query('select id, email, initial_balance from identity.users');
        assert.deepEqual(users.rows, [{ id: 1, email: 'history@example.test', initial_balance: 150 }]);
    });

    test('preserves the user ID sequence and legacy account creation and deletion', async (t) => {
        // сохраняет последовательность ID пользователей и старое создание и удаление аккаунтов
        const database = await prepareHistoricalDatabase(t, [FINANCE, COMPATIBILITY]);

        await applyMigration(database, IDENTITY);

        const user = await database.query(
            `insert into identity.users (email, name, password_hash)
             values ('next@example.test', 'Next', 'hash') returning id`,
        );
        assert.equal(user.rows[0]?.id, 2);
        const legacyUser = await database.query('select initial_balance from public.users where id = 2');
        assert.equal(legacyUser.rows[0]?.initial_balance, 0);
        const account = await database.query('select initial_balance from finance.accounts where user_id = 2');
        assert.equal(account.rows[0]?.initial_balance, 0);
        await database.query('delete from public.users where id = 2');
        const remaining = await database.query('select user_id from finance.accounts');
        assert.deepEqual(remaining.rows, [{ user_id: 1 }]);
    });

    test('returns users to public with their updated balances on rollback', async (t) => {
        // возвращает пользователей в public с обновлёнными балансами при откате
        const database = await prepareHistoricalDatabase(t, [FINANCE, COMPATIBILITY, IDENTITY]);
        await database.query('update finance.accounts set initial_balance = 150 where user_id = 1');

        await applyMigration(database, IDENTITY, 'down');

        const users = await database.query('select id, email, initial_balance from public.users');
        assert.deepEqual(users.rows, [{ id: 1, email: 'history@example.test', initial_balance: 150 }]);
    });
});

describe('010 removal of finance compatibility', () => {
    test('preserves identity and financial data when removing compatibility', async (t) => {
        // сохраняет данные identity и finance при снятии слоя совместимости
        const database = await prepareHistoricalDatabase(t, [FINANCE, COMPATIBILITY, IDENTITY]);
        await database.query(
            `insert into identity.sessions (user_id, token_hash, expires_at, device)
             values (1, repeat('a', 64), '2027-01-01', 'test device')`,
        );
        await database.query("update finance.accounts set initial_balance = 150, status = 'ready' where user_id = 1");
        const original = await readModuleData(database);

        await applyMigration(database, REMOVE_COMPATIBILITY);

        assert.deepEqual(await readModuleData(database), original);
    });

    test('restores current balances and bidirectional synchronization on rollback', async (t) => {
        // восстанавливает актуальные балансы и двустороннюю синхронизацию при откате
        const database = await prepareHistoricalDatabase(t, [FINANCE, COMPATIBILITY, IDENTITY, REMOVE_COMPATIBILITY]);
        await database.query('update finance.accounts set initial_balance = 200.50 where user_id = 1');

        await applyMigration(database, REMOVE_COMPATIBILITY, 'down');

        const restored = await database.query('select initial_balance from public.users where id = 1');
        assert.equal(restored.rows[0]?.initial_balance, 200.5);
        await database.query('update public.users set initial_balance = 150 where id = 1');
        const accounts = await database.query('select initial_balance from finance.accounts where user_id = 1');
        assert.equal(accounts.rows[0]?.initial_balance, 150);
        await database.query('update finance.accounts set initial_balance = -30.50 where user_id = 1');
        const users = await database.query('select initial_balance from public.users where id = 1');
        assert.equal(users.rows[0]?.initial_balance, -30.5);
    });

    test('restores legacy writes and cascading deletion on rollback', async (t) => {
        // восстанавливает запись через старые пути и каскадное удаление при откате
        const database = await prepareHistoricalDatabase(t, [FINANCE, COMPATIBILITY, IDENTITY, REMOVE_COMPATIBILITY]);

        await applyMigration(database, REMOVE_COMPATIBILITY, 'down');

        await createLegacyIncome(database);
        const operations = await database.query('select amount from finance.operations order by id');
        assert.deepEqual(operations.rows, [{ amount: 23.15 }, { amount: 10 }]);
        const user = await database.query(
            `insert into public.users (email, name, password_hash, initial_balance)
             values ('restored@example.test', 'Restored', 'hash', 42) returning id`,
        );
        assert.equal(user.rows[0]?.id, 2);
        const account = await database.query('select initial_balance from finance.accounts where user_id = 2');
        assert.equal(account.rows[0]?.initial_balance, 42);
        await database.query('delete from public.users where id = 1');
        const remaining = await database.query('select user_id from finance.accounts');
        assert.deepEqual(remaining.rows, [{ user_id: 2 }]);
        const categories = await database.query('select id from finance.categories');
        const deletedOperations = await database.query('select id from finance.operations');
        assert.deepEqual(categories.rows, []);
        assert.deepEqual(deletedOperations.rows, []);
    });

    test('keeps legacy balance writes working after rolling back identity as well', async (t) => {
        // сохраняет запись баланса через старые пути после дополнительного отката identity
        const database = await prepareHistoricalDatabase(t, [FINANCE, COMPATIBILITY, IDENTITY, REMOVE_COMPATIBILITY]);

        await applyMigration(database, REMOVE_COMPATIBILITY, 'down');
        await applyMigration(database, IDENTITY, 'down');

        await database.query('update finance.accounts set initial_balance = 75 where user_id = 1');
        const users = await database.query('select initial_balance from public.users where id = 1');
        assert.equal(users.rows[0]?.initial_balance, 75);
    });

    test('preserves independently created users and accounts on rollback', async (t) => {
        // сохраняет независимо созданных пользователей и аккаунты при откате
        const database = await prepareHistoricalDatabase(t, [FINANCE, COMPATIBILITY, IDENTITY, REMOVE_COMPATIBILITY]);
        await database.query(
            `insert into identity.users (email, name, password_hash)
             values ('independent@example.test', 'Independent', 'hash')`,
        );
        await database.query('insert into finance.accounts (user_id, initial_balance) values (999, 42.15)');
        const original = await readModuleData(database);

        await applyMigration(database, REMOVE_COMPATIBILITY, 'down');

        assert.deepEqual(await readModuleData(database), original);
        const users = await database.query('select initial_balance from public.users where id = 2');
        assert.equal(users.rows[0]?.initial_balance, 0);
    });
});

test('preserves all historical rows through the complete migration round trip', async (t) => {
    // сохраняет все исторические строки при полном применении и откате цепочки миграций
    const database = await prepareHistoricalDatabase(t);
    const original = await readLegacyData(database);

    for (const name of [FINANCE, COMPATIBILITY, IDENTITY, REMOVE_COMPATIBILITY]) {
        await applyMigration(database, name);
    }
    for (const name of [REMOVE_COMPATIBILITY, IDENTITY, COMPATIBILITY, FINANCE]) {
        await applyMigration(database, name, 'down');
    }

    assert.deepEqual(await readLegacyData(database), original);
});
