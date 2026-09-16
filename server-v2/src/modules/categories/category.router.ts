import { Router } from 'express';

import type { Authenticate } from '../../http/middleware/authenticate.ts';
import { ValidationMiddleware } from '../../http/middleware/validate.ts';
import { CategoryController } from './category.controller.ts';
import { categoryParamsSchema, categoryWriteSchema, moveOperationsSchema } from './category.schemas.ts';
import type { CategoryService } from './category.service.ts';

export class CategoryRouter {
    static create(service: CategoryService, authenticate: Authenticate): Router {
        const router = Router();

        for (const type of ['expense', 'income'] as const) {
            const controller = new CategoryController(service, type);
            const routes = Router();
            routes.get('/', controller.list);
            routes.get('/:id', ValidationMiddleware.params(categoryParamsSchema), controller.getById);
            routes.post('/', ValidationMiddleware.body(categoryWriteSchema), controller.create);
            routes.put('/:id', ValidationMiddleware.params(categoryParamsSchema),
                ValidationMiddleware.body(categoryWriteSchema), controller.rename);
            routes.delete('/:id', ValidationMiddleware.params(categoryParamsSchema), controller.delete);
            routes.delete('/:id/operations', ValidationMiddleware.params(categoryParamsSchema),
                controller.deleteOperations);
            routes.put('/:id/operations', ValidationMiddleware.params(categoryParamsSchema),
                ValidationMiddleware.body(moveOperationsSchema), controller.moveOperations);
            router.use(`/${type}`, authenticate.requireAuth, routes);
        }

        return router;
    }
}
