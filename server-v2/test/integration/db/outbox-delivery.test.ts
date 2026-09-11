import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { LocalEventDelivery } from '../../../src/application/local-event-delivery.ts';
import { OutboxRepository } from '../../../src/modules/identity/outbox/outbox.repository.ts';
import { OutboxWorker } from '../../../src/modules/identity/outbox/outbox.worker.ts';
import type { EventDelivery, UserRegisteredEvent } from '../../../src/modules/identity/contracts.ts';
import { useTestDatabase } from '../../helpers/db.ts';

const { database, logger } = useTestDatabase();

const events = new OutboxRepository(database);

const registerUser = async (): Promise<number> => {
    const { rows } = await database.query<{ id: number }>(
        `insert into identity.users (email, name, password_hash)
         values ($1, 'Queued User', 'hash')
         returning id`,
        [`queued-${randomUUID()}@example.test`],
    );
    const row = rows[0];
    assert.ok(row);
    await events.enqueueUserRegistered(row.id);
    return row.id;
};

class RecordingDelivery implements EventDelivery {
    readonly deliveredUserIds: number[] = [];
    failures: number;

    constructor(failures = 0) {
        this.failures = failures;
    }

    async deliver(event: UserRegisteredEvent): Promise<void> {
        if (this.failures > 0) {
            this.failures -= 1;
            throw new Error('finance is unavailable');
        }
        await new Promise(resolve => setTimeout(resolve, 20));
        this.deliveredUserIds.push(event.userId);
    }
}

const readEvent = async (userId: number) => {
    const { rows } = await database.query(
        `select attempts, last_error, delivered_at is null as pending, available_at > now() as delayed
           from identity.outbox where user_id = $1`,
        [userId],
    );
    return rows[0];
};

const worker = (delivery: EventDelivery): OutboxWorker => new OutboxWorker(
    database, delivery, logger, { pollIntervalMs: 50 },
);

test('two workers split the queue without delivering an event twice', async () => {
    // два обработчика делят очередь, не доставляя событие дважды
    const userIds = [await registerUser(), await registerUser(), await registerUser()];
    const delivery = new RecordingDelivery();
    const first = worker(delivery);
    const second = worker(delivery);

    const counts = await Promise.all([first.drain(), second.drain()]);

    assert.equal(counts[0] + counts[1], 3, 'каждое событие обработано ровно один раз');
    assert.deepEqual([...delivery.deliveredUserIds].sort(), [...userIds].sort());
    const pending = await database.query(
        'select count(*)::integer as count from identity.outbox where delivered_at is null',
    );
    assert.equal(pending.rows[0]?.count, 0);
});

test('redelivery after a lost acknowledgement leaves one prepared account', async () => {
    // повторная доставка после потерянного подтверждения оставляет один подготовленный аккаунт
    const userId = await registerUser();
    await worker(new LocalEventDelivery(database)).drain();

    await database.query(
        'update identity.outbox set delivered_at = null, available_at = now() where user_id = $1',
        [userId],
    );
    await worker(new LocalEventDelivery(database)).drain();

    const accounts = await database.query(
        'select user_id, status from finance.accounts where user_id = $1', [userId],
    );
    assert.deepEqual(accounts.rows, [{ user_id: userId, status: 'ready' }]);
    const categories = await database.query<{ count: number }>(
        'select count(*)::integer as count from finance.categories where user_id = $1', [userId],
    );
    assert.equal(categories.rows[0]?.count, 15);
});

test('keeps a failed event in the queue and delivers it after a restart', async () => {
    // сохраняет неудавшееся событие в очереди и доставляет его после перезапуска
    const userId = await registerUser();
    const failing = new RecordingDelivery(1);

    await worker(failing).drain();

    const afterFailure = await readEvent(userId);
    assert.deepEqual(afterFailure, {
        attempts: 1, last_error: 'finance is unavailable', pending: true, delayed: true,
    });

    await database.query('update identity.outbox set available_at = now() where user_id = $1', [userId]);
    await worker(new LocalEventDelivery(database)).drain();

    const afterRetry = await readEvent(userId);
    assert.deepEqual(afterRetry, { attempts: 2, last_error: null, pending: false, delayed: false });
    const status = await database.query(
        'select status from finance.accounts where user_id = $1', [userId],
    );
    assert.equal(status.rows[0]?.status, 'ready');
});

test('refuses an acknowledgement from an expired lease', async () => {
    // отклоняет подтверждение по истёкшему захвату
    const userId = await registerUser();
    const expired = await events.claim(60);
    assert.ok(expired);
    await database.query(
        "update identity.outbox set leased_until = now() - interval '1 second' where user_id = $1",
        [userId],
    );

    const current = await events.claim(60);
    assert.ok(current);
    assert.notEqual(current.leaseToken, expired.leaseToken);

    assert.equal(await events.acknowledge(expired.eventId, expired.leaseToken), false);
    assert.equal(await events.acknowledge(current.eventId, current.leaseToken), true);
});
