import type { Database } from '../../../db/database.ts';
import type { Logger } from '../../../logging/logger.ts';
import { OutboxRepository, type ClaimedEvent } from './outbox.repository.ts';
import {
    USER_REGISTERED,
    USER_REGISTERED_VERSION,
    type EventDelivery,
    type UserRegisteredEvent,
} from './user-registered.ts';

const POLL_INTERVAL_MS = 1000;

const LEASE_SECONDS = 60;

const RETRY_DELAYS_SECONDS = [1, 2, 4, 8, 16, 32] as const;

const MAX_RETRY_DELAY_SECONDS = 60;

/**
 * Предел попыток доставки одного события. Шесть первых интервалов и три
 * минутных дают примерно четыре минуты повторов: временная недоступность
 * finance за это время проходит, а отказ на данных не исчезнет и после.
 */
export const MAX_DELIVERY_ATTEMPTS = 10;

export const retryDelaySeconds = (attempts: number): number => (
    RETRY_DELAYS_SECONDS[attempts - 1] ?? MAX_RETRY_DELAY_SECONDS
);

export type OutboxWorkerOptions = {
    pollIntervalMs?: number;
    leaseSeconds?: number;
};

/** null означает событие, которого этот обработчик не знает. */
const toUserRegistered = (claimed: ClaimedEvent): UserRegisteredEvent | null => {
    if (claimed.type !== USER_REGISTERED || claimed.version !== USER_REGISTERED_VERSION) {
        return null;
    }

    return {
        eventId: claimed.eventId,
        type: USER_REGISTERED,
        version: USER_REGISTERED_VERSION,
        userId: claimed.userId,
        occurredAt: claimed.occurredAt,
    };
};

// инициирует создание фин акка, только он это делает
// Раз в секунду забирает событие, вызывает доставку, записывает исход
export class OutboxWorker {
    readonly #events: OutboxRepository;
    readonly #delivery: EventDelivery;
    readonly #logger: Logger;
    readonly #pollIntervalMs: number;
    readonly #leaseSeconds: number;

    #timer: NodeJS.Timeout | null = null;
    #running: Promise<void> | null = null;
    #stopping = false;

    constructor(
        identity: Database,
        delivery: EventDelivery,
        logger: Logger,
        options: OutboxWorkerOptions = {},
    ) {
        this.#events = new OutboxRepository(identity);
        this.#delivery = delivery;
        this.#logger = logger.child({ worker: 'outbox' });
        this.#pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
        this.#leaseSeconds = options.leaseSeconds ?? LEASE_SECONDS;
    }

    start(): void {
        if (this.#timer !== null) {
            return;
        }

        this.#timer = setInterval(() => {
            void this.#tick();
        }, this.#pollIntervalMs);
        this.#timer.unref();
    }

    async stop(): Promise<void> {
        this.#stopping = true;

        if (this.#timer !== null) {
            clearInterval(this.#timer);
            this.#timer = null;
        }

        await this.#running;
    }

    async drain(): Promise<number> {
        let processed = 0;

        while (!this.#stopping && await this.#processOne()) {
            processed += 1;
        }

        return processed;
    }

    async #tick(): Promise<void> {
        if (this.#running !== null) {
            return;
        }

        this.#running = this.drain().then(
            () => undefined,
            (error: unknown) => {
                this.#logger.error({ err: error }, 'outbox poll failed');
            },
        );

        try {
            await this.#running;
        } finally {
            this.#running = null;
        }
    }

    async #processOne(): Promise<boolean> {
        const claimed = await this.#events.claim(this.#leaseSeconds);

        if (claimed === null) {
            return false;
        }

        const context = {
            eventId: claimed.eventId,
            userId: claimed.userId,
            attempt: claimed.attempts,
            waitingMs: Date.now() - claimed.occurredAt.getTime(),
        };
        const event = toUserRegistered(claimed);

        if (event === null) {
            // Повторы не помогут: тип события не станет известным сам собой.
            const reason = `Unsupported outbox event ${claimed.type} v${claimed.version}`;
            await this.#events.abandon(claimed.eventId, claimed.leaseToken, reason);
            this.#logger.error({ ...context, type: claimed.type }, 'unsupported outbox event');

            return true;
        }

        try {
            await this.#delivery.deliver(event);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            if (claimed.attempts >= MAX_DELIVERY_ATTEMPTS) {
                // Получатель записывает отказ у себя, событие уходит из очереди.
                await this.#delivery.fail(event, message);
                await this.#events.abandon(claimed.eventId, claimed.leaseToken, message);
                this.#logger.error({ ...context, err: error }, 'event delivery attempts exhausted');

                return true;
            }

            const delaySeconds = retryDelaySeconds(claimed.attempts);
            await this.#events.scheduleRetry(claimed.eventId, claimed.leaseToken, delaySeconds, message);
            this.#logger.warn({ ...context, delaySeconds, err: error }, 'event delivery failed');

            return true;
        }

        const acknowledged = await this.#events.acknowledge(claimed.eventId, claimed.leaseToken);

        if (acknowledged) {
            this.#logger.info(context, 'event delivered');
        } else {
            this.#logger.warn(context, 'event lease expired during delivery');
        }

        return true;
    }
}
