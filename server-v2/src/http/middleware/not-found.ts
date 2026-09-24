import type { NextFunction, Request, Response } from 'express';

import { NotFoundError } from '../../errors/app-error.ts';

export class NotFoundHandler {
    readonly reject = (req: Request, _res: Response, next: NextFunction): void => {
        next(new NotFoundError(`Cannot ${req.method} ${req.path}`));
    };
}
