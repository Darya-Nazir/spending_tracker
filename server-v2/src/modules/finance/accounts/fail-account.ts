import type { QueryExecutor } from '../../../db/database.ts';
import { AccountRepository } from './account.repository.ts';

/** Отмечает аккаунт как несостоявшийся: попытки подготовки исчерпаны. */
export async function markAccountFailed(
    userId: number,
    reason: string,
    executor: QueryExecutor,
): Promise<void> {
    await new AccountRepository(executor).markFailed(userId, reason);
}
