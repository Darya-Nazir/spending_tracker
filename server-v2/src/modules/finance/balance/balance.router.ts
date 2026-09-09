import { Router } from 'express';

import type { Authenticate } from '../../../http/middleware/authenticate.ts';
import type { BalanceController } from './balance.controller.ts';

export class BalanceRouter {
    static create(controller: BalanceController, authenticate: Authenticate): Router {
        const router = Router();
        router.get('/balance', authenticate.requireAuth, controller.getBalance);
        return router;
    }
}
