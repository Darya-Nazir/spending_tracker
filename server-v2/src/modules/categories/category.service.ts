import { NotFoundError, ValidationError } from '../../errors/app-error.ts';
import type { Category, CategoryRepository, CategoryType } from './category.repository.ts';

export class CategoryService {
    private readonly categories: CategoryRepository;

    constructor(categories: CategoryRepository) {
        this.categories = categories;
    }

    list(userId: number, type: CategoryType): Promise<Category[]> {
        return this.categories.list(userId, type);
    }

    create(userId: number, type: CategoryType, title: string): Promise<Category> {
        return this.categories.create(userId, type, title);
    }

    async rename(userId: number, type: CategoryType, id: number, title: string): Promise<Category> {
        const category = await this.categories.rename(userId, type, id, title);
        if (category === null) {
            throw new NotFoundError('Category not found');
        }
        return category;
    }

    async delete(userId: number, type: CategoryType, id: number): Promise<void> {
        const deleted = await this.categories.delete(userId, type, id);
        if (!deleted) {
            throw new NotFoundError('Category not found');
        }
    }

    async getById(userId: number, type: CategoryType, id: number): Promise<Category> {
        const category = await this.categories.findById(userId, type, id);
        if (category === null) {
            throw new NotFoundError('Category not found');
        }
        return category;
    }

    async deleteOperations(userId: number, type: CategoryType, id: number): Promise<void> {
        const category = await this.categories.findById(userId, type, id);
        if (category === null) {
            throw new NotFoundError('Category not found');
        }
        await this.categories.deleteOperations(userId, type, id);
    }

    async moveOperations(userId: number, type: CategoryType, id: number, targetCategoryId: number): Promise<void> {
        const category = await this.categories.findById(userId, type, id);
        if (category === null) {
            throw new NotFoundError('Category not found');
        }
        if (targetCategoryId === id) {
            throw new ValidationError('Target category ID must differ from the source category ID');
        }
        const target = await this.categories.findById(userId, type, targetCategoryId);
        if (target === null) {
            throw new NotFoundError('Target category not found');
        }
        await this.categories.moveOperations(userId, type, id, targetCategoryId);
    }
}
