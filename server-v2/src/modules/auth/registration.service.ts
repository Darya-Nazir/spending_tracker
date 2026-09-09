import type { Database } from '../../db/database.ts';
import { AccountRepository } from '../finance/accounts/account.repository.ts';
import { UserRepository, type CreateUserInput, type User } from '../users/user.repository.ts';

/** Переходная регистрация в общей БД. Этапы 13.8–13.10 вводят доставку событий. */
export class RegistrationService {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async register(input: CreateUserInput): Promise<User> {
        return this.#database.transaction(async executor => {
            const user = await new UserRepository(executor).create(input);
            await new AccountRepository(executor).create(user.id);
            return user;
        });
    }
}
