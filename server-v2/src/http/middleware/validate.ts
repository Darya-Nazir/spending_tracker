import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { ValidationError } from '../../errors/app-error.ts';
// Схема задаёт правила, 
// а вызов query(...), params(...) или body(...) выбирает, 
// к какой части запроса эти правила применить.
export class ValidationMiddleware {
    static body(schema: ZodType): RequestHandler {
        return this.#validate(schema, 'body');
    }
// значения внутри пути URL
    static params(schema: ZodType<Request['params']>): RequestHandler {
        return this.#validate(schema, 'params');
    }
// значения после ?
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
