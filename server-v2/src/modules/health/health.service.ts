import type { Database } from '../../db/database.ts';

export type Health = { status: 'ok' };

export type Readiness = { db: 'up' | 'down' };

export class HealthService {
    private readonly database: Database;

    constructor(database: Database) {
        this.database = database;
    }

    check(): Health {
        return { status: 'ok' };
    }

    async readiness(): Promise<Readiness> {
        return { db: (await this.database.isReachable()) ? 'up' : 'down' };
    }
}
