import type { QueryExecutor } from '../../../db/database.ts';
import { AccountRepository } from './account.repository.ts';

/** Создаёт финансовый аккаунт пользователя; повторный вызов данные сохраняет. */
export async function ensureAccount(userId: number, executor: QueryExecutor): Promise<void> {
    await new AccountRepository(executor).create(userId);
}
