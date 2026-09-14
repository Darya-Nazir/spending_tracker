import type { Database } from '../db/database.ts';
import { handleUserRegistered, markAccountFailed } from '../modules/finance/contracts.ts';
import type { EventDelivery, UserRegisteredEvent } from '../modules/identity/contracts.ts';

// Отдаёт событие из identity в finance внутри одного процесса
export class LocalEventDelivery implements EventDelivery {
    readonly #finance: Database;

    constructor(finance: Database) {
        this.#finance = finance;
    }

    async deliver(event: UserRegisteredEvent): Promise<void> {
        await handleUserRegistered(event, this.#finance);
    }

    async fail(event: UserRegisteredEvent, reason: string): Promise<void> {
        await markAccountFailed(event.userId, reason, this.#finance);
    }
}
