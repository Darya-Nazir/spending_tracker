import { randomUUID } from 'node:crypto';

import type { QueryExecutor } from '../../../db/database.ts';
import { USER_REGISTERED, USER_REGISTERED_VERSION } from './user-registered.ts';

export type ClaimedEvent = {
    eventId: string;
    type: string;
    version: number;
    userId: number;
    occurredAt: Date;
    attempts: number;
    leaseToken: string;
};

type ClaimedRow = {
    event_id: string;
    type: string;
    version: number;
    user_id: number;
    occurred_at: Date;
    attempts: number;
    lease_token: string;
};

// SQL очереди: постановка, захват, подтверждение, перенос попытки
// Все четыре - действия над одной строкой события в identity.outbox
export class OutboxRepository {
    readonly #database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.#database = database;
    }
// постановка
    async enqueueUserRegistered(userId: number): Promise<void> {
        await this.#database.query(
            `insert into identity.outbox (event_id, type, version, user_id)
             values ($1, $2, $3, $4)
             on conflict (type, version, user_id) do nothing`,
            [randomUUID(), USER_REGISTERED, USER_REGISTERED_VERSION, userId],
        );
    }
// массовая постановка событий пользователям, у которых строки нет
    async backfillUserRegistered(): Promise<number> {
        const { rowCount } = await this.#database.query(
            `insert into identity.outbox (event_id, type, version, user_id, occurred_at)
             select gen_random_uuid(), $1, $2, id, created_at
               from identity.users
             on conflict (type, version, user_id) do nothing`,
            [USER_REGISTERED, USER_REGISTERED_VERSION],
        );

        return rowCount ?? 0;
    }
// захват
    async claim(leaseSeconds: number): Promise<ClaimedEvent | null> {
        const { rows } = await this.#database.query<ClaimedRow>(
            `with claimed as (
                 select id from identity.outbox
                  where delivered_at is null
                    and available_at <= now()
                    and (leased_until is null or leased_until <= now())
                  order by available_at, id
                    for update skip locked
                  limit 1
             )
             update identity.outbox o
                set lease_token = gen_random_uuid(),
                    leased_until = now() + ($1::integer * interval '1 second'),
                    attempts = o.attempts + 1
               from claimed
              where o.id = claimed.id
             returning o.event_id, o.type, o.version, o.user_id, o.occurred_at,
                       o.attempts, o.lease_token`,
            [leaseSeconds],
        );
        const row = rows[0];

        if (row === undefined) {
            return null;
        }

        return {
            eventId: row.event_id,
            type: row.type,
            version: row.version,
            userId: row.user_id,
            occurredAt: row.occurred_at,
            attempts: row.attempts,
            leaseToken: row.lease_token,
        };
    }
// подтверждение
    async acknowledge(eventId: string, leaseToken: string): Promise<boolean> {
        const { rowCount } = await this.#database.query(
            `update identity.outbox
                set delivered_at = now(), lease_token = null, leased_until = null, last_error = null
              where event_id = $1 and lease_token = $2 and delivered_at is null`,
            [eventId, leaseToken],
        );

        return (rowCount ?? 0) > 0;
    }
// перенос попытки
    async scheduleRetry(
        eventId: string,
        leaseToken: string,
        delaySeconds: number,
        error: string,
    ): Promise<boolean> {
        const { rowCount } = await this.#database.query(
            `update identity.outbox
                set available_at = now() + ($3::integer * interval '1 second'),
                    lease_token = null,
                    leased_until = null,
                    last_error = $4
              where event_id = $1 and lease_token = $2 and delivered_at is null`,
            [eventId, leaseToken, delaySeconds, error],
        );

        return (rowCount ?? 0) > 0;
    }
}
