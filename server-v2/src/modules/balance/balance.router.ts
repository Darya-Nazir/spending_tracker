import { Router } from 'express';

import type { Authenticate } from '../../http/middleware/authenticate.ts';
import { ValidationMiddleware } from '../../http/middleware/validate.ts';
import type { BalanceController } from './balance.controller.ts';
import { balanceWriteSchema } from './balance.schemas.ts';

export class BalanceRouter {
    static create(controller: BalanceController, authenticate: Authenticate): Router {
        const router = Router();

        router.get('/', authenticate.requireAuth, controller.get);
        router.put('/', authenticate.requireAuth, ValidationMiddleware.body(balanceWriteSchema), controller.put);

        return router;
    }
}
