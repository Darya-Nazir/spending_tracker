import type { Config } from '../config/config.ts';
import { Database } from './database.ts';
import type { Logger } from '../logging/logger.ts';

export type ModuleName = 'identity' | 'finance';

export type ModuleReadiness = Record<ModuleName, 'up' | 'down'>;

// Держит оба пула на 2 "базы"
export class Connections {
    readonly identity: Database;
    readonly finance: Database;

    constructor(config: Config, logger: Logger) {
        this.identity = new Database(config.moduleDatabaseUrls.identity, logger, 'identity');
        this.finance = new Database(config.moduleDatabaseUrls.finance, logger, 'finance');
    }

    async readiness(): Promise<ModuleReadiness> {
        const [identity, finance] = await Promise.all([
            this.identity.isReachable(),
            this.finance.isReachable(),
        ]);

        return {
            identity: identity ? 'up' : 'down',
            finance: finance ? 'up' : 'down',
        };
    }

    async close(): Promise<void> {
        const results = await Promise.allSettled([this.identity.close(), this.finance.close()]);
        const failure = results.find(result => result.status === 'rejected');

        if (failure !== undefined) {
            throw failure.reason;
        }
    }
}
