import type { Request, Response } from 'express';

import type { OperationService } from './operation.service.ts';

export class OperationController {
    readonly #service: OperationService;

    constructor(service: OperationService) {
        this.#service = service;
    }

    readonly list = async (req: Request, res: Response): Promise<void> => {
        res.json(await this.#service.list(req.auth!.userId));
    };
}
