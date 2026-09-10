import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../errors/app-error.ts';
import type { AuthIdentity, TokenService } from '../../modules/identity/contracts.ts';

declare global {
    namespace Express {
        interface Request {
            auth?: AuthIdentity;
        }
    }
}

export class Authenticate {
    readonly #tokens: TokenService;

    constructor(tokens: TokenService) {
        this.#tokens = tokens;
    }

    readonly requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const header = req.headers.authorization;
            const match = typeof header === 'string' ? /^Bearer +([^\s,]+)$/i.exec(header) : null;
            const token = match?.[1];
            if (token === undefined) {
                throw new UnauthorizedError('Authorization must contain a Bearer token');
            }
            req.auth = this.#tokens.verifyAccess(token);
            if (req.log) {
                req.log = req.log.child({ userId: req.auth.userId });
            }
        } catch (error) {
            next(error);
            return;
        }
        next();
    };
}
