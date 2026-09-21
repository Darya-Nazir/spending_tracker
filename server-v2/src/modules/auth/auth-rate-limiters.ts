import { ipRateLimitKey, loginRateLimitKey, RateLimiter } from '../../http/middleware/rate-limit.ts';
import type { AuthRateLimiters } from './auth.router.ts';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 5;

const REFRESH_ATTEMPT_LIMIT = 100;

export class AuthRateLimiterFactory {
    static create(): AuthRateLimiters {
        return {
            loginRateLimiter: new RateLimiter({
                windowMs: RATE_LIMIT_WINDOW_MS,
                max: LOGIN_ATTEMPT_LIMIT,
                keyFor: loginRateLimitKey,
                message: 'Too many login attempts, please try again later',
                countOn: (statusCode) => statusCode === 401,
            }),
            refreshRateLimiter: new RateLimiter({
                windowMs: RATE_LIMIT_WINDOW_MS,
                max: REFRESH_ATTEMPT_LIMIT,
                keyFor: ipRateLimitKey,
                message: 'Too many token refresh attempts, please try again later',
            }),
        };
    }
}
