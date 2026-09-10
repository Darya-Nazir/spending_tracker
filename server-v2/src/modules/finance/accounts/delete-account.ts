import type { QueryExecutor } from '../../../db/database.ts';
import { AccountRepository } from './account.repository.ts';

/** Удаляет финансовые данные пользователя. */
export async function deleteAccount(userId: number, executor: QueryExecutor): Promise<void> {
    await new AccountRepository(executor).deleteByUserId(userId);
}
