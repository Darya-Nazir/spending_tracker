import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import type { Config } from '../../../config/config.ts';
import { UnauthorizedError } from '../../../errors/app-error.ts';

export type TokenPair = {
    accessToken: string;
    refreshToken: string;
};

export type AuthIdentity = Readonly<{ userId: number }>;

/** Выпускает JWT и возвращает личность после проверки подписи и срока. */
export class TokenService {
    readonly #jwt: Config['jwt'];

    constructor(config: Config) {
        this.#jwt = config.jwt;
    }

    issueTokenPair(userId: number): TokenPair {
        if (!Number.isSafeInteger(userId) || userId <= 0) {
            throw new Error('Token userId must be a positive safe integer');
        }

        const subject = String(userId);
        return {
            accessToken: jwt.sign({}, this.#jwt.accessSecret, {
                algorithm: 'HS256', subject, expiresIn: this.#jwt.accessTtl, jwtid: randomUUID(),
            }),
            refreshToken: jwt.sign({}, this.#jwt.refreshSecret, {
                algorithm: 'HS256', subject, expiresIn: this.#jwt.refreshTtl, jwtid: randomUUID(),
            }),
        };
    }

    verifyAccess(token: string): AuthIdentity {
        return this.#verify(token, this.#jwt.accessSecret);
    }

    verifyRefresh(token: string): AuthIdentity {
        return this.#verify(token, this.#jwt.refreshSecret);
    }
    
// общий приватный метод проверки токена. Первые два метода вызывают его с нужным секретом
    #verify(token: string, secret: string): AuthIdentity {
        try {
            const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
            if (typeof payload === 'string'
                || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)
                || typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub)) {
                throw new Error('Invalid token claims');
            }
            const userId = Number(payload.sub);
            if (!Number.isSafeInteger(userId)) {
                throw new Error('Invalid token subject');
            }
            return { userId };
        } catch {
            throw new UnauthorizedError('Invalid or expired token');
        }
    }
}
