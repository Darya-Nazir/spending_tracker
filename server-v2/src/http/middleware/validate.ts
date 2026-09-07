import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { ValidationError } from '../../errors/app-error.ts';

export class ValidationMiddleware {
    static body(schema: ZodType): RequestHandler {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                const message = result.error.issues
                    .map((issue) => issue.message)
                    .join('; ');

                return next(new ValidationError(message));
            }

            req.body = result.data;
            next();
        };
    }
}
