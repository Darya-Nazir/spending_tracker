import type { Database } from '../db/database.ts';
import { ensureAccount } from '../modules/finance/contracts.ts';
import { UserRepository, type CreateUserInput, type User } from '../modules/identity/users/user.repository.ts';

/** Координирует создание пользователя и финансового аккаунта в общей транзакции. */
export class RegistrationService {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async register(input: CreateUserInput): Promise<User> {
        return this.#database.transaction(async executor => {
            const user = await new UserRepository(executor).create(input);
            await ensureAccount(user.id, executor);
            return user;
        });
    }
}
