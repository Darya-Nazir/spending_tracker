import type { Request, Response } from 'express';

import type { BalanceService } from './balance.service.ts';

export class BalanceController {
    readonly #service: BalanceService;

    constructor(service: BalanceService) {
        this.#service = service;
    }

    readonly get = async (req: Request, res: Response): Promise<void> => {
        res.json({ balance: await this.#service.get(req.auth!.userId) });
    };
}
