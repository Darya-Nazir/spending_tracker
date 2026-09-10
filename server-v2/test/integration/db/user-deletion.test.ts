import assert from 'node:assert/strict';
import { test } from 'node:test';

import { UserDeletionService } from '../../../src/application/user-deletion.service.ts';
import { useTestDatabase } from '../../helpers/db.ts';
import { createUser } from '../../helpers/factories.ts';

const { database } = useTestDatabase();
const deletion = new UserDeletionService(database);

const createUserWithData = async () => {
    const user = await createUser(database, { initialBalance: 100 });
    await database.query(
        `insert into identity.sessions (user_id, token_hash, expires_at, device)
         values ($1, $2, '2027-01-01', 'test device')`, [user.id, String(user.id).padStart(64, '0')],
    );
    const category = await database.query<{ id: number }>(
        "insert into finance.categories (user_id, type, title) values ($1, 'income', 'Зарплата') returning id",
        [user.id],
    );
    assert.ok(category.rows[0]);
    await database.query(
        `insert into finance.operations (user_id, category_id, type, amount, date)
         values ($1, $2, 'income', 10, '2026-09-01')`, [user.id, category.rows[0].id],
    );
    return user;
};

const readUserData = async (userId: number) => {
    const results = await Promise.all([
        database.query('select * from identity.users where id = $1', [userId]),
        database.query('select * from identity.sessions where user_id = $1', [userId]),
        database.query('select * from finance.accounts where user_id = $1', [userId]),
        database.query('select * from finance.categories where user_id = $1', [userId]),
        database.query('select * from finance.operations where user_id = $1', [userId]),
    ]);
    return results.map(result => result.rows);
};

test('deletes the user and owned data while preserving another users data', async () => {
    // удаляет пользователя и его данные, сохраняя данные другого пользователя
    const user = await createUserWithData();
    const other = await createUserWithData();
    const otherData = await readUserData(other.id);

    await deletion.delete(user.id);
    await deletion.delete(user.id);

    assert.deepEqual(await readUserData(user.id), [[], [], [], [], []]);
    assert.deepEqual(await readUserData(other.id), otherData);
});

test('restores financial data when identity deletion fails', async (t) => {
    // восстанавливает финансовые данные при ошибке удаления пользователя в identity
    const user = await createUserWithData();
    const original = await readUserData(user.id);
    await database.query('create table identity.test_deletion_guard (user_id integer references identity.users(id))');
    t.after(() => database.query('drop table identity.test_deletion_guard'));
    await database.query('insert into identity.test_deletion_guard values ($1)', [user.id]);

    await assert.rejects(deletion.delete(user.id), { code: '23503' });

    assert.deepEqual(await readUserData(user.id), original);
});

test('deletes sessions and preserves financial data when an identity row is deleted directly', async () => {
    // удаляет сессии и сохраняет финансовые данные при прямом удалении строки identity
    const user = await createUserWithData();
    const original = await readUserData(user.id);

    await database.query('delete from identity.users where id = $1', [user.id]);

    const remaining = await readUserData(user.id);
    assert.deepEqual(remaining.slice(0, 2), [[], []]);
    assert.deepEqual(remaining.slice(2), original.slice(2));
});
