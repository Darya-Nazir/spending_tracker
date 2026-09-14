import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../errors/app-error.ts';
import { financeNotReady, type AccountStatusService } from '../../modules/finance/contracts.ts';

/**
 * пускает к финансовым маршрутам только при статусе ready
 */
export class RequireFinanceReady {
    readonly #statuses: AccountStatusService;

    constructor(statuses: AccountStatusService) {
        this.#statuses = statuses;
    }

    readonly requireReady = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (req.auth === undefined) {
                throw new UnauthorizedError('Authentication is required');
            }

            const { status } = await this.#statuses.getStatus(req.auth.userId);

            if (status !== 'ready') {
                throw financeNotReady();
            }
        } catch (error) {
            next(error);
            return;
        }

        next();
    };
}
