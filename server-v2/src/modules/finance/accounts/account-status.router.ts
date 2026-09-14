import { Router } from 'express';

import type { Authenticate } from '../../../http/middleware/authenticate.ts';
import type { AccountStatusController } from './account-status.controller.ts';

export class AccountStatusRouter {
    static create(controller: AccountStatusController, authenticate: Authenticate): Router {
        const router = Router();
        // Маршрут статуса проверяет только токен: его вызывают до готовности.
        router.get('/finance/status', authenticate.requireAuth, controller.getStatus);
        return router;
    }
}
