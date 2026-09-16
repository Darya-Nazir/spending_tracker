import type { Request, Response } from 'express';

import type { Operation } from './operation.repository.ts';
import type { OperationCreateInput } from './operation.schemas.ts';
import type { OperationService } from './operation.service.ts';

export class OperationController {
    readonly #service: OperationService;

    constructor(service: OperationService) {
        this.#service = service;
    }

    readonly list = async (req: Request, res: Response): Promise<void> => {
        res.json(await this.#service.list(req.auth!.userId));
    };

    readonly create = async (
        req: Request<Record<string, never>, Operation, OperationCreateInput>,
        res: Response<Operation>,
    ): Promise<void> => {
        res.status(201).json(await this.#service.create(req.auth!.userId, req.body));
    };
}
