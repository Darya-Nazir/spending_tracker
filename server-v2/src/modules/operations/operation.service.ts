import type { CategoryRepository } from '../categories/category.repository.ts';
import { NotFoundError, ValidationError } from '../../errors/app-error.ts';
import { OperationMapper } from './operation.mapper.ts';
import type { Operation, OperationRepository } from './operation.repository.ts';
import type { OperationCreateInput, OperationListInput } from './operation.schemas.ts';
import { Period } from './period.ts';

export class OperationService {
    readonly #operations: OperationRepository;
    readonly #categories: CategoryRepository;
    readonly #timeZone: string;

    constructor(operations: OperationRepository, categories: CategoryRepository, timeZone: string) {
        this.#operations = operations;
        this.#categories = categories;
        this.#timeZone = timeZone;
    }

    list(userId: number, input: OperationListInput): Promise<Operation[]> {
        return this.#operations.list(userId, Period.range(input, this.#timeZone));
    }

    async create(userId: number, input: OperationCreateInput): Promise<Operation> {
        const category = await this.#categories.findOwnedById(userId, input.category_id);
        if (category === null) {
            throw new NotFoundError('Category not found');
        }
        if (category.type !== input.type) {
            throw new ValidationError('category_id does not belong to the given type');
        }

        const inserted = await this.#operations.create(
            userId, category.id, input.type, input.amount, input.date, input.comment,
        );
        return OperationMapper.toResponse(inserted, category.title);
    }
}
