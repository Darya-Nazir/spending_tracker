import { Router } from 'express';

import type { RateLimiter } from '../../http/middleware/rate-limit.ts';
import { ValidationMiddleware } from '../../http/middleware/validate.ts';
import type { AuthController } from './auth.controller.ts';
import { loginSchema, refreshSchema, signupSchema } from './auth.schemas.ts';

export type AuthRateLimiters = Readonly<{
    loginRateLimiter: RateLimiter;
    refreshRateLimiter: RateLimiter;
}>;

export class AuthRouter {
    static create(controller: AuthController, rateLimiters: AuthRateLimiters): Router {
        const router = Router();

        router.post('/signup', ValidationMiddleware.body(signupSchema), controller.signup);
        router.post(
            '/login',
            rateLimiters.loginRateLimiter.check,
            ValidationMiddleware.body(loginSchema),
            controller.login,
        );
        router.post(
            '/refresh',
            rateLimiters.refreshRateLimiter.check,
            ValidationMiddleware.body(refreshSchema),
            controller.refresh,
        );
        router.post('/logout', ValidationMiddleware.body(refreshSchema), controller.logout);

        return router;
    }
}
