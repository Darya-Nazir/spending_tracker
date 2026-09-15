import type { Request, Response } from 'express';

import type { CategoryType } from './category.repository.ts';
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
}
