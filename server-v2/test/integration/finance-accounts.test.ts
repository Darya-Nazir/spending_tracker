import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';

import { useTestApp } from '../helpers/app.ts';
import { BalanceRepository } from '../../src/modules/finance/balance/balance.repository.ts';

const { app, database } = useTestApp();
const signup = { name: 'Finance User', email: 'finance@example.test', password: 'secret1', passwordRepeat: 'secret1' };

test('creates a financial account during registration with the compatibility trigger disabled', async (t) => {
    // создаёт финансовый аккаунт при регистрации с отключённым триггером совместимости
    await database.query('alter table identity.users disable trigger users_account_insert');
    t.after(() => database.query('alter table identity.users enable trigger users_account_insert'));
    const response = await request(app).post('/api/signup').send(signup).expect(201);
    const { rows } = await database.query('select user_id, initial_balance, status from finance.accounts');
    assert.deepEqual(rows, [{ user_id: response.body.user.id, initial_balance: 0, status: 'pending' }]);
});

test('rolls back registration when financial account creation fails with the compatibility trigger disabled', async (t) => {
    // откатывает регистрацию при ошибке создания аккаунта с отключённым триггером совместимости
    await database.query('alter table identity.users disable trigger users_account_insert');
    t.after(() => database.query('alter table identity.users enable trigger users_account_insert'));
    await database.query("alter table finance.accounts add constraint test_account_failure check (user_id < 0)");
    try {
        await request(app).post('/api/signup').send(signup).expect(500);
        const result = await database.query('select count(*)::integer as count from identity.users');
        assert.equal(result.rows[0]?.count, 0);
    } finally {
        await database.query('alter table finance.accounts drop constraint test_account_failure');
    }
});

test('reads a financial balance independently of the identity user', async () => {
    // читает финансовый баланс независимо от пользователя в модуле авторизации
    await database.query('insert into finance.accounts (user_id, initial_balance) values (123, 42.15)');
    assert.equal(await new BalanceRepository(database).findByUserId(123), 42.15);
});

test('keeps financial foreign keys inside the finance schema', async () => {
    // сохраняет внешние ключи финансовых таблиц внутри схемы finance
    const { rows } = await database.query<{ source: string; target_schema: string }>(
        `select source.relname as source, target_namespace.nspname as target_schema
           from pg_constraint c
           join pg_class source on source.oid = c.conrelid
           join pg_namespace source_namespace on source_namespace.oid = source.relnamespace
           join pg_class target on target.oid = c.confrelid
           join pg_namespace target_namespace on target_namespace.oid = target.relnamespace
          where c.contype = 'f' and source_namespace.nspname = 'finance'`,
    );
    assert.equal(rows.length, 3);
    assert.ok(rows.every(row => row.target_schema === 'finance'));
});
