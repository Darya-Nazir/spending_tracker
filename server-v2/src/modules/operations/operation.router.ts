import { Router } from 'express';

import type { Authenticate } from '../../http/middleware/authenticate.ts';
import { ValidationMiddleware } from '../../http/middleware/validate.ts';
import type { OperationController } from './operation.controller.ts';
import { operationCreateSchema, operationListSchema } from './operation.schemas.ts';

export class OperationRouter {
    static create(controller: OperationController, authenticate: Authenticate): Router {
        const router = Router();

        router.get('/', authenticate.requireAuth, ValidationMiddleware.query(operationListSchema), controller.list);
        router.post(
            '/', authenticate.requireAuth, ValidationMiddleware.body(operationCreateSchema), controller.create,
        );

        return router;
    }
}
