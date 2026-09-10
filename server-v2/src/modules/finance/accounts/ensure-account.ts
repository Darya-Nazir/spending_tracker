import type { QueryExecutor } from '../../../db/database.ts';
import { AccountRepository } from './account.repository.ts';

/** Создаёт финансовый аккаунт пользователя на основе его ID, 
 * которое пришло от создания пользователя */
export async function ensureAccount(userId: number, executor: QueryExecutor): Promise<void> {
    await new AccountRepository(executor).create(userId);
}
