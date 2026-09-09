import type { Request, Response } from 'express';

import { UnauthorizedError } from '../../../errors/app-error.ts';
import type { Balance, BalanceService } from './balance.service.ts';

export class BalanceController {
    readonly #service: BalanceService;

    constructor(service: BalanceService) {
        this.#service = service;
    }

    readonly getBalance = async (req: Request, res: Response<Balance>): Promise<void> => {
        if (req.auth === undefined) {
            throw new UnauthorizedError('Authentication is required');
        }
        const balance = await this.#service.getBalance(req.auth.userId);
        res.status(200).json(balance);
    };
}
