import { Router } from 'express';

import type { Authenticate } from '../../../http/middleware/authenticate.ts';
import type { RequireFinanceReady } from '../../../http/middleware/require-finance-ready.ts';
import type { BalanceController } from './balance.controller.ts';

export class BalanceRouter {
    static create(
        controller: BalanceController,
        authenticate: Authenticate,
        financeReady: RequireFinanceReady,
    ): Router {
        const router = Router();
        router.get('/balance', authenticate.requireAuth, financeReady.requireReady, controller.getBalance);
        return router;
    }
}
