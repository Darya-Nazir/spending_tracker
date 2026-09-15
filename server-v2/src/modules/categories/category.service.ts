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

    async getById(userId: number, type: CategoryType, id: number): Promise<Category> {
        const category = await this.#categories.findById(userId, type, id);
        if (category === null) {
            throw new NotFoundError('Category not found');
        }
        return category;
    }
}
