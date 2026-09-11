import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { handleUserRegistered } from '../../../src/modules/finance/contracts.ts';
import type { UserRegisteredEvent } from '../../../src/modules/identity/contracts.ts';
import { useTestDatabase } from '../../helpers/db.ts';

const { database } = useTestDatabase();

const createIdentityUser = async (): Promise<number> => {
    const { rows } = await database.query<{ id: number }>(
        `insert into identity.users (email, name, password_hash)
         values ($1, 'Prepared User', 'hash')
         returning id`,
        [`prepared-${randomUUID()}@example.test`],
    );
    const row = rows[0];
    assert.ok(row);
    return row.id;
};

const userRegistered = (userId: number): UserRegisteredEvent => ({
    eventId: randomUUID(),
    type: 'UserRegistered',
    version: 1,
    userId,
    occurredAt: new Date(),
});

const readCategories = async (userId: number) => {
    const { rows } = await database.query(
        `select type, count(*)::integer as count
           from finance.categories
          where user_id = $1
          group by type
          order by type::text`,
        [userId],
    );
    return rows;
};

const readStatus = async (userId: number): Promise<string | undefined> => {
    const { rows } = await database.query<{ status: string }>(
        'select status from finance.accounts where user_id = $1', [userId],
    );
    return rows[0]?.status;
};

test('gives a new account ten expense and five income categories and turns it ready', async () => {
    // выдаёт новому аккаунту десять расходных и пять доходных категорий и переводит его в ready
    const userId = await createIdentityUser();

    await handleUserRegistered(userRegistered(userId), database);

    assert.deepEqual(await readCategories(userId), [
        { type: 'expense', count: 10 },
        { type: 'income', count: 5 },
    ]);
    assert.equal(await readStatus(userId), 'ready');

    const system = await database.query(
        `select type, title from finance.categories
          where user_id = $1 and is_default order by type::text`,
        [userId],
    );
    assert.deepEqual(system.rows, [
        { type: 'expense', title: 'Общее' },
        { type: 'income', title: 'Общее' },
    ]);
});

test('keeps one set of categories, the balance and user rows on repeated and concurrent handling', async () => {
    // сохраняет один набор категорий, баланс и пользовательские строки при повторе и одновременной обработке
    const userId = await createIdentityUser();
    await database.query(
        'insert into finance.accounts (user_id, initial_balance) values ($1, 250.75)', [userId],
    );
    await database.query(
        `insert into finance.categories (user_id, type, title, title_normalized)
         values ($1, 'expense', 'Подписки', 'подписки')`,
        [userId],
    );

    const event = userRegistered(userId);
    await Promise.all([
        handleUserRegistered(event, database),
        handleUserRegistered(event, database),
    ]);
    await handleUserRegistered(event, database);

    assert.deepEqual(await readCategories(userId), [
        { type: 'expense', count: 11 },
        { type: 'income', count: 5 },
    ]);
    assert.equal(await readStatus(userId), 'ready');
    const balance = await database.query(
        'select initial_balance from finance.accounts where user_id = $1', [userId],
    );
    assert.equal(balance.rows[0]?.initial_balance, 250.75);
});

test('leaves the account unprepared when seeding fails halfway', async (t) => {
    // оставляет аккаунт неподготовленным при сбое посреди засева
    const userId = await createIdentityUser();
    await database.query(
        "alter table finance.categories add constraint test_seed_failure check (title <> 'Спорт')",
    );
    t.after(() => database.query('alter table finance.categories drop constraint test_seed_failure'));

    await assert.rejects(handleUserRegistered(userRegistered(userId), database), { code: '23514' });

    assert.deepEqual(await readCategories(userId), []);
    assert.equal(await readStatus(userId), undefined);
});

test('matches an existing category by its normalized title and keeps its id', async () => {
    // сопоставляет существующую категорию по нормализованному названию и сохраняет её id
    const userId = await createIdentityUser();
    await database.query(
        'insert into finance.accounts (user_id) values ($1)', [userId],
    );
    const existing = await database.query<{ id: number }>(
        `insert into finance.categories (user_id, type, title, title_normalized)
         values ($1, 'expense', 'ОБЩЕЕ', 'общее')
         returning id`,
        [userId],
    );
    const existingId = existing.rows[0]?.id;
    assert.ok(existingId);

    await handleUserRegistered(userRegistered(userId), database);

    const { rows } = await database.query(
        `select id, title, is_default from finance.categories
          where user_id = $1 and type = 'expense' and title_normalized = 'общее'`,
        [userId],
    );
    assert.deepEqual(rows, [{ id: existingId, title: 'ОБЩЕЕ', is_default: true }]);
    assert.deepEqual(await readCategories(userId), [
        { type: 'expense', count: 10 },
        { type: 'income', count: 5 },
    ]);
});
