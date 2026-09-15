import { EmailService } from '../users/email.service.ts';
import { UserRepository } from '../users/user.repository.ts';
import { CategoryRepository } from '../categories/category.repository.ts';
import type { Database } from '../../db/database.ts';
import type { LoginInput, RefreshInput, SignupInput } from './auth.schemas.ts';
import type { PasswordService } from './password.service.ts';
import type { TokenPair, TokenService } from './token.service.ts';
import { UnauthorizedError } from '../../errors/app-error.ts';

export type LoginResult = {
    tokens: TokenPair;
    user: { id: number; name: string };
};

export type PublicUser = {
    id: number;
    email: string;
    name: string;
};

export class AuthService {
    readonly #users: UserRepository;
    readonly #passwords: PasswordService;
    readonly #emails: EmailService;
    readonly #tokens: TokenService;
    readonly #database: Database;

    constructor(
        users: UserRepository,
        passwords: PasswordService,
        emails: EmailService,
        tokens: TokenService,
        database: Database,
    ) {
        this.#users = users;
        this.#passwords = passwords;
        this.#emails = emails;
        this.#tokens = tokens;
        this.#database = database;
    }

    async signup(input: SignupInput): Promise<PublicUser> {
        const email = this.#emails.normalize(input.email);
        const passwordHash = await this.#passwords.hash(input.password);
        const user = await this.#database.transaction(async (executor) => {
            const created = await new UserRepository(executor).create({
                email,
                name: input.name,
                passwordHash,
            });
            await new CategoryRepository(executor).seedDefaults(created.id);
            return created;
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
        };
    }

    async login(input: LoginInput): Promise<LoginResult> {
        const user = await this.#users.findByEmail(this.#emails.normalize(input.email));
        if (user === null || !await this.#passwords.verify(input.password, user.passwordHash)) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Этап 13: оба значения rememberMe используют общий срок refresh.
        return {
            tokens: this.#tokens.issueTokenPair(user.id),
            user: { id: user.id, name: user.name },
        };
    }

    refresh(input: RefreshInput): TokenPair {
        const { userId } = this.#tokens.verifyRefresh(input.refreshToken);
        return this.#tokens.issueTokenPair(userId);
    }

    logout(_input: RefreshInput): void {
        // Этап 21 добавит отзыв сессии по переданному refreshToken.
    }
}
