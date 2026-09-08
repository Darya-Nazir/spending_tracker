import { Router } from 'express';

import { ValidationMiddleware } from '../../http/middleware/validate.ts';
import type { AuthController } from './auth.controller.ts';
import { loginSchema, refreshSchema, signupSchema } from './auth.schemas.ts';

export class AuthRouter {
    static create(controller: AuthController): Router {
        const router = Router();

        router.post('/signup', ValidationMiddleware.body(signupSchema), controller.signup);
        router.post('/login', ValidationMiddleware.body(loginSchema), controller.login);
        router.post('/refresh', ValidationMiddleware.body(refreshSchema), controller.refresh);
        router.post('/logout', ValidationMiddleware.body(refreshSchema), controller.logout);

        return router;
    }
}
