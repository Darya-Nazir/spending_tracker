import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import { Client } from 'pg';

import { assertTestDatabaseName, TEST_DATABASE_URL } from './helpers/db.ts';

const migrationsDirectory = fileURLToPath(new URL('../migrations/current', import.meta.url));

export const globalSetup = async (): Promise<void> => {
    const databaseUrl = new URL(TEST_DATABASE_URL);
    const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
    assertTestDatabaseName(databaseName);

    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = '/postgres';
    const admin = new Client({ connectionString: adminUrl.toString() });

    try {
        await admin.connect();
        const exists = await admin.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [databaseName],
        );

        if (exists.rowCount === 0) {
            const identifier = `"${databaseName.replaceAll('"', '""')}"`;
            await admin.query(`CREATE DATABASE ${identifier}`);
        }
    } finally {
        await admin.end();
    }

    await runner({
        databaseUrl: TEST_DATABASE_URL,
        dir: migrationsDirectory,
        direction: 'up',
        migrationsTable: 'pgmigrations',
    });
};
