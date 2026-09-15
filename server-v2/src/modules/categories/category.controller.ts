import type { Request, Response } from 'express';

import type { Category, CategoryType } from './category.repository.ts';
import type { CategoryWriteInput } from './category.schemas.ts';
import type { CategoryService } from './category.service.ts';

export class CategoryController {
    readonly #service: CategoryService;
    readonly #type: CategoryType;

    constructor(service: CategoryService, type: CategoryType) {
        this.#service = service;
        this.#type = type;
    }

    readonly list = async (req: Request, res: Response): Promise<void> => {
        res.json(await this.#service.list(req.auth!.userId, this.#type));
    };

    readonly getById = async (req: Request, res: Response): Promise<void> => {
        res.json(await this.#service.getById(req.auth!.userId, this.#type, Number(req.params.id)));
    };

    readonly create = async (
        req: Request<Record<string, never>, Category, CategoryWriteInput>,
        res: Response<Category>,
    ): Promise<void> => {
        res.status(201).json(await this.#service.create(req.auth!.userId, this.#type, req.body.title));
    };

    readonly rename = async (
        req: Request<{ id: string }, Category, CategoryWriteInput>,
        res: Response<Category>,
    ): Promise<void> => {
        res.json(await this.#service.rename(req.auth!.userId, this.#type, Number(req.params.id), req.body.title));
    };
}
