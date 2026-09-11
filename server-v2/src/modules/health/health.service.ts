import type { Connections, ModuleReadiness } from '../../db/connections.ts';

/**
 * Две проверки с разным смыслом:
 *
 *   check()     — процесс принимает и обрабатывает запросы. В базу не ходит.
 *   readiness() — база отвечает на запрос, значит запрос можно обслужить
 *                 целиком.
 */

export type Health = { status: 'ok' };

export type Readiness = ModuleReadiness & { db: 'up' | 'down' };

export class HealthService {
    readonly #connections: Connections;

    constructor(connections: Connections) {
        this.#connections = connections;
    }

    check(): Health {
        return { status: 'ok' };
    }

    async readiness(): Promise<Readiness> {
        const modules = await this.#connections.readiness();
        const db = modules.identity === 'up' && modules.finance === 'up' ? 'up' : 'down';

        return { db, ...modules };
    }
}
