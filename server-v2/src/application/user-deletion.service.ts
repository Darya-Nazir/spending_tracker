import type { Database } from '../db/database.ts';
import { deleteAccount } from '../modules/finance/contracts.ts';
import { UserRepository } from '../modules/identity/users/user.repository.ts';

/** Координирует удаление финансовых данных и пользователя в общей транзакции. */
export class UserDeletionService {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async delete(userId: number): Promise<void> {
        await this.#database.transaction(async executor => {
            await deleteAccount(userId, executor);
            await new UserRepository(executor).deleteById(userId);
        });
    }
}
