import { Router } from 'express';

import { ValidationMiddleware } from '../../http/middleware/validate.ts';
import type { AuthController } from './auth.controller.ts';
import { signupSchema } from './auth.schemas.ts';

export class AuthRouter {
    static create(controller: AuthController): Router {
        const router = Router();

        router.post('/signup', ValidationMiddleware.body(signupSchema), controller.signup);

        return router;
    }
}
