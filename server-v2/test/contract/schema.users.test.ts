import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { useTestDatabase } from '../helpers/db.ts';

const { database } = useTestDatabase();

type ColumnMetadata = {
    column_name: string;
};

type IndexMetadata = {
    indexname: string;
    indexdef: string;
};

describe('users schema', () => {
    test('users contains only identity fields', async () => {
        // users содержит только данные идентификации
        const { rows: usersColumnMetadataRows } = await database.query<ColumnMetadata>(
            `select column_name
               from information_schema.columns
              where table_schema = 'identity'
                and table_name = 'users'
              order by ordinal_position`,
        );

        assert.deepEqual(
            usersColumnMetadataRows.map(column => column.column_name),
            ['id', 'email', 'name', 'password_hash', 'created_at'],
        );
    });

    test('email is unique regardless of letter case', async () => {
        // email уникален независимо от регистра букв
        const firstEmail = 'Stage-6-Case@Example.test';
        const sameEmailInAnotherCase = 'stage-6-case@example.TEST';

        await database.query(
            `insert into identity.users (email, name, password_hash)
             values ($1, $2, $3)`,
            [firstEmail, 'First User', 'not-a-real-password-hash'],
        );

        await assert.rejects(
            database.query(
                `insert into identity.users (email, name, password_hash)
                 values ($1, $2, $3)`,
                [sameEmailInAnotherCase, 'Second User', 'not-a-real-password-hash'],
            ),
            (error: unknown) => {
                assert.equal(
                    (error as { code?: string }).code,
                    '23505',
                    'PostgreSQL must reject the duplicate with unique_violation',
                );

                return true;
            },
        );
    });

    test('canonical email has a plain unique index and keeps the compatibility index', async () => {
        // у канонического email есть обычный уникальный индекс и сохранён индекс совместимости
        const { rows: indexRows } = await database.query<IndexMetadata>(
            `select indexname, indexdef
               from pg_indexes
              where schemaname = 'identity'
                and tablename = 'users'
                and indexname in ('users_email_unique', 'users_email_lower_unique')`,
        );
        const indexesByName = new Map(
            indexRows.map((indexMetadata) => [indexMetadata.indexname, indexMetadata.indexdef]),
        );

        assert.match(
            indexesByName.get('users_email_unique') ?? '',
            /create unique index users_email_unique on identity\.users using btree \(email\)/i,
        );
        assert.match(
            indexesByName.get('users_email_lower_unique') ?? '',
            /create unique index users_email_lower_unique on identity\.users using btree \(lower\(email\)\)/i,
        );
    });
});
