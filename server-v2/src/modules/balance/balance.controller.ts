import type { Request, Response } from 'express';

import type { BalanceWriteInput } from './balance.schemas.ts';
import type { BalanceService } from './balance.service.ts';

export class BalanceController {
    private readonly service: BalanceService;

    constructor(service: BalanceService) {
        this.service = service;
    }

    readonly get = async (req: Request, res: Response): Promise<void> => {
        res.json({ balance: await this.service.get(req.auth!.userId) });
    };

    readonly put = async (
        req: Request<Record<string, never>, { balance: number }, BalanceWriteInput>,
        res: Response<{ balance: number }>,
    ): Promise<void> => {
        res.json({ balance: await this.service.set(req.auth!.userId, req.body.balance) });
    };
}
