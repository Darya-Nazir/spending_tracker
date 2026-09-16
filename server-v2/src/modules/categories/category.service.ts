import { NotFoundError } from '../../errors/app-error.ts';
import type { Category, CategoryRepository, CategoryType } from './category.repository.ts';

export class CategoryService {
    readonly #categories: CategoryRepository;

    constructor(categories: CategoryRepository) {
        this.#categories = categories;
    }

    list(userId: number, type: CategoryType): Promise<Category[]> {
        return this.#categories.list(userId, type);
    }

    create(userId: number, type: CategoryType, title: string): Promise<Category> {
        return this.#categories.create(userId, type, title);
    }

    async rename(userId: number, type: CategoryType, id: number, title: string): Promise<Category> {
        const category = await this.#categories.rename(userId, type, id, title);
        if (category === null) {
            throw new NotFoundError('Category not found');
        }
        return category;
    }

    async delete(userId: number, type: CategoryType, id: number): Promise<void> {
        const deleted = await this.#categories.delete(userId, type, id);
        if (!deleted) {
            throw new NotFoundError('Category not found');
        }
    }

    async getById(userId: number, type: CategoryType, id: number): Promise<Category> {
        const category = await this.#categories.findById(userId, type, id);
        if (category === null) {
            throw new NotFoundError('Category not found');
        }
        return category;
    }
}
