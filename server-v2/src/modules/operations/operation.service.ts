import type { CategoryRepository } from '../categories/category.repository.ts';
import { NotFoundError, ValidationError } from '../../errors/app-error.ts';
import { OperationMapper } from './operation.mapper.ts';
import type { Operation, OperationRepository } from './operation.repository.ts';
import type { OperationCreateInput, OperationListInput, OperationUpdateInput } from './operation.schemas.ts';
import { Period } from './period.ts';

export class OperationService {
    private readonly operations: OperationRepository;
    private readonly categories: CategoryRepository;
    private readonly timeZone: string;

    constructor(operations: OperationRepository, categories: CategoryRepository, timeZone: string) {
        this.operations = operations;
        this.categories = categories;
        this.timeZone = timeZone;
    }

    list(userId: number, input: OperationListInput): Promise<Operation[]> {
        return this.operations.list(userId, Period.range(input, this.timeZone));
    }

    async getById(userId: number, id: number): Promise<Operation> {
        const operation = await this.operations.findOwnedById(userId, id);
        if (operation === null) {
            throw new NotFoundError('Operation not found');
        }
        return operation;
    }

    async create(userId: number, input: OperationCreateInput): Promise<Operation> {
        const category = await this.resolveCategory(userId, input);
        const inserted = await this.operations.create(
            userId, category.id, input.type, input.amount, input.date, input.comment,
        );
        return OperationMapper.toResponse(inserted, category.title);
    }

    async update(userId: number, id: number, input: OperationUpdateInput): Promise<Operation> {
        const category = await this.resolveCategory(userId, input);
        const updated = await this.operations.update(
            userId, id, category.id, input.type, input.amount, input.date, input.comment,
        );
        if (updated === null) {
            throw new NotFoundError('Operation not found');
        }
        return OperationMapper.toResponse(updated, category.title);
    }

    async delete(userId: number, id: number): Promise<void> {
        const deleted = await this.operations.delete(userId, id);
        if (!deleted) {
            throw new NotFoundError('Operation not found');
        }
    }

    private async resolveCategory(userId: number, input: OperationCreateInput | OperationUpdateInput) {
        const category = await this.categories.findOwnedById(userId, input.category_id);
        if (category === null) {
            throw new NotFoundError('Category not found');
        }
        if (category.type !== input.type) {
            throw new ValidationError('category_id does not belong to the given type');
        }
        return category;
    }
}
