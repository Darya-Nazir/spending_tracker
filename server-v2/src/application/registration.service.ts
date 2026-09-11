import type { Database } from '../db/database.ts';
import { enqueueUserRegistered } from '../modules/identity/contracts.ts';
import { UserRepository, type CreateUserInput, type User } from '../modules/identity/users/user.repository.ts';

export class RegistrationService {
    readonly #identity: Database;

    constructor(identity: Database) {
        this.#identity = identity;
    }

    async register(input: CreateUserInput): Promise<User> {
        return this.#identity.transaction(async executor => {
            const user = await new UserRepository(executor).create(input);
            await enqueueUserRegistered(user.id, executor);
            return user;
        });
    }
}
