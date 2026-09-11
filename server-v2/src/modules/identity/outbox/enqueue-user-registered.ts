import type { QueryExecutor } from '../../../db/database.ts';
import { OutboxRepository } from './outbox.repository.ts';

export async function enqueueUserRegistered(userId: number, executor: QueryExecutor): Promise<void> {
    await new OutboxRepository(executor).enqueueUserRegistered(userId);
}
