import { EmailService } from '../users/email.service.ts';
import type { UserRepository } from '../users/user.repository.ts';
import type { SignupInput } from './auth.schemas.ts';
import type { PasswordService } from './password.service.ts';

export type PublicUser = {
    id: number;
    email: string;
    name: string;
};

export class AuthService {
    readonly #users: UserRepository;
    readonly #passwords: PasswordService;
    readonly #emails: EmailService;

    constructor(
        users: UserRepository,
        passwords: PasswordService,
        emails: EmailService,
    ) {
        this.#users = users;
        this.#passwords = passwords;
        this.#emails = emails;
    }

    async signup(input: SignupInput): Promise<PublicUser> {
        const email = this.#emails.normalize(input.email);
        const passwordHash = await this.#passwords.hash(input.password);
        const user = await this.#users.create({
            email,
            name: input.name,
            passwordHash,
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
        };
    }
}
