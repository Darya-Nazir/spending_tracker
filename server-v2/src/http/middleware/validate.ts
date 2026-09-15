import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { ValidationError } from '../../errors/app-error.ts';

export class ValidationMiddleware {
    static body(schema: ZodType): RequestHandler {
        return this.#validate(schema, 'body');
    }

    static params(schema: ZodType<Request['params']>): RequestHandler {
        return this.#validate(schema, 'params');
    }

    /** Проверяет query; Express предоставляет req.query через getter. */
    static query(schema: ZodType): RequestHandler {
        return this.#validate(schema, 'query');
    }

    static #validate(schema: ZodType, source: 'body' | 'params' | 'query'): RequestHandler {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const result = schema.safeParse(req[source]);

            if (!result.success) {
                const message = result.error.issues
                    .map((issue) => issue.message)
                    .join('; ');

                return next(new ValidationError(message));
            }

            if (source !== 'query') {
                req[source] = result.data;
            }
            next();
        };
    }
}
