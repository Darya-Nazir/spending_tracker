import type { Request, Response } from 'express';

import type { Operation } from './operation.repository.ts';
import type { OperationCreateInput, OperationListInput, OperationUpdateInput } from './operation.schemas.ts';
import type { OperationService } from './operation.service.ts';

export class OperationController {
    private readonly service: OperationService;

    constructor(service: OperationService) {
        this.service = service;
    }

    readonly list = async (
        req: Request<Record<string, never>, Operation[], unknown, OperationListInput>,
        res: Response<Operation[]>,
    ): Promise<void> => {
        res.json(await this.service.list(req.auth!.userId, req.query));
    };

    readonly getById = async (req: Request, res: Response<Operation>): Promise<void> => {
        res.json(await this.service.getById(req.auth!.userId, Number(req.params.id)));
    };

    readonly create = async (
        req: Request<Record<string, never>, Operation, OperationCreateInput>,
        res: Response<Operation>,
    ): Promise<void> => {
        res.status(201).json(await this.service.create(req.auth!.userId, req.body));
    };

    readonly update = async (
        req: Request<{ id: string }, Operation, OperationUpdateInput>,
        res: Response<Operation>,
    ): Promise<void> => {
        res.json(await this.service.update(req.auth!.userId, Number(req.params.id), req.body));
    };

    readonly delete = async (
        req: Request, res: Response<{ error: boolean; message: string }>,
    ): Promise<void> => {
        await this.service.delete(req.auth!.userId, Number(req.params.id));
        res.json({ error: false, message: 'Operation deleted successfully' });
    };
}
