import { after, beforeEach } from 'node:test';

import { Config } from '../../src/config/config.ts';
import { Database } from '../../src/db/database.ts';
import { Logger } from '../../src/logging/logger.ts';
import { MemorySink } from './memory-sink.ts';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
    ?? 'postgres://spending:spending@localhost:5432/spending_test';

type DatabaseNameRow = {
    database_name: string;
};

type TableNameRow = {
    qualified_name: string;
};

export type TestDatabaseContext = {
    config: Config;
    database: Database;
    logger: Logger;
    sink: MemorySink;
};

export const createTestDatabase = (
    databaseUrl: string = TEST_DATABASE_URL,
): TestDatabaseContext => {
    const config = Config.load({
        NODE_ENV: 'test',
        PORT: '3000',
        LOG_LEVEL: 'debug',
        DATABASE_URL: databaseUrl,
        JWT_ACCESS_SECRET: 'test-access-secret-with-enough-length',
        JWT_REFRESH_SECRET: 'test-refresh-secret-with-enough-length',
    });
    const sink = new MemorySink();
    const logger = Logger.create(config, sink);
    const database = new Database(config, logger);

    return { config, database, logger, sink };
};

/** Не позволяет очистить development/production базу из-за ошибки в окружении. */
export const assertTestDatabaseName = (databaseName: string): void => {
    if (!databaseName.endsWith('_test')) {
        throw new Error(
            `Refusing to reset database "${databaseName}": its name must end with "_test"`,
        );
    }
};

export const resetDb = async (database: Database): Promise<void> => {
    const { rows: databaseNameRows } = await database.query<DatabaseNameRow>(
        'SELECT current_database() AS database_name',
    );
    const databaseName = databaseNameRows[0]?.database_name;

    if (databaseName === undefined) {
        throw new Error('PostgreSQL did not return the current database name');
    }

    assertTestDatabaseName(databaseName);

    const { rows: tableNameRows } = await database.query<TableNameRow>(
        `SELECT format('%I.%I', table_schema, table_name) AS qualified_name
           FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name <> 'pgmigrations'
          ORDER BY table_name`,
    );

    if (tableNameRows.length === 0) {
        return;
    }

    const tableNames = tableNameRows.map(({ qualified_name }) => qualified_name).join(', ');
    await database.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
};

export const useTestDatabase = (): TestDatabaseContext => {
    const context = createTestDatabase();

    beforeEach(async () => {
        await resetDb(context.database);
    });

    after(async () => {
        await context.database.close();
    });

    return context;
};
