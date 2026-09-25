import { createHash } from 'node:crypto';

import { EmailService } from '../users/email.service.ts';
import { UserRepository } from '../users/user.repository.ts';
import { CategoryRepository } from '../categories/category.repository.ts';
import type { Database } from '../../db/database.ts';
import type { LoginInput, RefreshInput, SignupInput } from './auth.schemas.ts';
import type { PasswordService } from './password.service.ts';
import type { TokenPair, TokenService } from './token.service.ts';
import { UnauthorizedError } from '../../errors/app-error.ts';
import { SessionRepository } from './session.repository.ts';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

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
    private readonly users: UserRepository;
    private readonly passwords: PasswordService;
    private readonly emails: EmailService;
    private readonly tokens: TokenService;
    private readonly database: Database;

    constructor(
        users: UserRepository,
        passwords: PasswordService,
        emails: EmailService,
        tokens: TokenService,
        database: Database,
    ) {
        this.users = users;
        this.passwords = passwords;
        this.emails = emails;
        this.tokens = tokens;
        this.database = database;
    }

    async signup(input: SignupInput): Promise<PublicUser> {
        const email = this.emails.normalize(input.email);
        const passwordHash = await this.passwords.hash(input.password);
        const user = await this.database.transaction(async (executor) => {
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

    async login(input: LoginInput, device = 'unknown'): Promise<LoginResult> {
        const user = await this.users.findByEmail(this.emails.normalize(input.email));
        if (user === null || !await this.passwords.verify(input.password, user.passwordHash)) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const expiresAt = this.tokens.sessionExpiresAt(input.rememberMe ?? false);
        const tokens = this.tokens.issueTokenPair(user.id, expiresAt);
        await new SessionRepository(this.database).create(
            user.id, hashToken(tokens.refreshToken), expiresAt, device.slice(0, 512),
        );
        return {
            tokens,
            user: { id: user.id, name: user.name },
        };
    }

    async refresh(input: RefreshInput): Promise<TokenPair> {
        const { userId } = this.tokens.verifyRefresh(input.refreshToken);
        const tokens = await this.database.transaction(async (executor) => {
            const sessions = new SessionRepository(executor);
            await sessions.lockUser(userId);
            const session = await sessions.findByTokenHash(hashToken(input.refreshToken));
            if (session === null || session.user_id !== userId) return null;
            if (session.revoked_at !== null) {
                await sessions.revokeChain(session.id);
                return null;
            }
            if (session.expires_at.getTime() <= Date.now()) return null;

            const pair = this.tokens.issueTokenPair(userId, session.expires_at);
            const replacementId = await sessions.create(
                userId, hashToken(pair.refreshToken), session.expires_at, session.device,
            );
            await sessions.replace(session.id, replacementId);
            return pair;
        });

        if (tokens === null) throw new UnauthorizedError('Invalid or expired session');
        return tokens;
    }

    async logout(input: RefreshInput): Promise<void> {
        await this.database.transaction(async (executor) => {
            const sessions = new SessionRepository(executor);
            const session = await sessions.findByTokenHash(hashToken(input.refreshToken));
            if (session === null) return;
            await sessions.lockUser(session.user_id);
            await sessions.revokeChain(session.id);
        });
    }
}
