import type { Request, Response } from 'express';

import { UnauthorizedError } from '../../../errors/app-error.ts';
import type { AccountStatusService, FinanceStatus } from './account-status.service.ts';
// отдаёт статус по userId из токена в JSON
export class AccountStatusController {
    readonly #service: AccountStatusService;

    constructor(service: AccountStatusService) {
        this.#service = service;
    }

    readonly getStatus = async (req: Request, res: Response<FinanceStatus>): Promise<void> => {
        if (req.auth === undefined) {
            throw new UnauthorizedError('Authentication is required');
        }
        const status = await this.#service.getStatus(req.auth.userId);
        res.status(200).json(status);
    };
}
