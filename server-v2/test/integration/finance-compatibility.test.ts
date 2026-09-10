import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';

import type { Database } from '../../src/db/database.ts';
import { BalanceRepository } from '../../src/modules/finance/balance/balance.repository.ts';
import { createMigrationDatabase, MIGRATIONS_THROUGH_009 } from '../helpers/migrations.ts';

/** Каждый сценарий проверяет совместимость на отдельной базе версии 009. */
const createLegacyFixture = async (t: TestContext, initialBalance = 0) => {
    const database = await createMigrationDatabase(t, MIGRATIONS_THROUGH_009);
    const { rows } = await database.query<{ id: number }>(
        `insert into public.users (email, name, password_hash, initial_balance)
         values ('legacy@example.test', 'Legacy User', 'hash', $1) returning id, initial_balance`,
        [initialBalance],
    );
    assert.ok(rows[0]);
    return { database, balances: new BalanceRepository(database), userId: rows[0].id };
};

const legacyBalance = async (database: Database, userId: number): Promise<number> => {
    const { rows } = await database.query<{ balance: number }>(
        `select u.initial_balance + coalesce((
            select sum(case when o.type = 'income' then o.amount else -o.amount end)
            from public.operations o where o.user_id = u.id
        ), 0) as balance from public.users u where u.id = $1`, [userId],
    );
    assert.ok(rows[0]);
    return rows[0].balance;
};

test('creates a financial account through legacy registration', async (t) => {
    // создаёт финансовый аккаунт через старую регистрацию
    const { database, balances, userId } = await createLegacyFixture(t, 12.34);
    const { rows } = await database.query('select initial_balance, status from finance.accounts where user_id = $1', [userId]);
    assert.deepEqual(rows, [{ initial_balance: 12.34, status: 'pending' }]);
    assert.equal(await legacyBalance(database, userId), 12.34);
    assert.equal(await balances.findByUserId(userId), 12.34);
});

test('shares category and operation writes between legacy and finance paths', async (t) => {
    // использует общие данные категорий и операций через старые пути и finance
    const { database, balances, userId } = await createLegacyFixture(t, 100);
    const category = await database.query<{ id: number }>(
        "insert into public.categories (user_id, type, title) values ($1, 'expense'::public.category_type, 'Еда') returning id", [userId],
    );
    const categoryId = category.rows[0]!.id;
    const operation = await database.query<{ id: number }>(
        "insert into public.operations (user_id, category_id, type, amount, date) values ($1, $2, 'expense', 25.50, current_date) returning id",
        [userId, categoryId],
    );
    const operationId = operation.rows[0]!.id;
    assert.equal(await balances.findByUserId(userId), 74.5);
    await database.query('update finance.operations set amount = 50 where id = $1', [operationId]);
    assert.equal(await legacyBalance(database, userId), 50);
    await database.query('update public.operations set amount = 60 where id = $1', [operationId]);
    assert.equal(await balances.findByUserId(userId), 40);
    await database.query('delete from public.operations where id = $1', [operationId]);
    await database.query('delete from public.categories where id = $1', [categoryId]);
    assert.equal(await balances.findByUserId(userId), 100);
    const remaining = await database.query('select count(*)::integer as count from finance.categories');
    assert.equal(remaining.rows[0]?.count, 0);
});

test('synchronizes starting balances in both directions and rolls changes back atomically', async (t) => {
    // синхронизирует стартовые балансы в обе стороны и атомарно откатывает изменения
    const { database, balances, userId } = await createLegacyFixture(t, 10);
    await database.query('update public.users set initial_balance = 20.25 where id = $1', [userId]);
    assert.equal(await balances.findByUserId(userId), 20.25);
    await database.query('update finance.accounts set initial_balance = -30.50 where user_id = $1', [userId]);
    assert.equal(await legacyBalance(database, userId), -30.5);
    const failure = new Error('Abort balance change');
    await assert.rejects(database.transaction(async executor => {
        await executor.query('update public.users set initial_balance = 999 where id = $1', [userId]);
        throw failure;
    }), failure);
    assert.equal(await legacyBalance(database, userId), -30.5);
    assert.equal(await balances.findByUserId(userId), -30.5);
});

test('preserves legacy cascading deletion of financial data', async (t) => {
    // сохраняет каскадное удаление финансовых данных старым кодом
    const { database, balances, userId } = await createLegacyFixture(t);
    const category = await database.query<{ id: number }>(
        "insert into public.categories (user_id, type, title) values ($1, 'income', 'Зарплата') returning id", [userId],
    );
    await database.query(
        "insert into public.operations (user_id, category_id, type, amount, date) values ($1, $2, 'income', 100, current_date)",
        [userId, category.rows[0]!.id],
    );
    await database.query('delete from public.users where id = $1', [userId]);
    assert.equal(await balances.findByUserId(userId), null);
    const result = await database.query('select count(*)::integer as count from finance.operations');
    assert.equal(result.rows[0]?.count, 0);
});
