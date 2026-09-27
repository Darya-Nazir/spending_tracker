import type { QueryExecutor } from '../../db/database.ts';
import { ConflictError, NotFoundError } from '../../errors/app-error.ts';
import { CategoryTitleService } from './category-title.service.ts';

const STANDARD_CATEGORIES = {
    expense: ['Еда', 'Жилье', 'Здоровье', 'Кафе', 'Авто', 'Одежда', 'Развлечения', 'Счета', 'Спорт', 'Общее'],
    income: ['Депозиты', 'Зарплата', 'Сбережения', 'Инвестиции', 'Общее'],
};

export type CategoryType = keyof typeof STANDARD_CATEGORIES;
export type Category = { id: number; title: string };

const rethrowWriteError = (error: unknown): never => {
    if (typeof error === 'object' && error !== null
        && 'code' in error && error.code === '23505'
        && 'constraint' in error
        && error.constraint === 'categories_user_type_title_normalized_unique') {
        throw new ConflictError('Category with given title already exists');
    }
    throw error;
};

export class CategoryRepository {
    private readonly database: QueryExecutor;
    private readonly titles = new CategoryTitleService();

    constructor(database: QueryExecutor) {
        this.database = database;
    }

    async list(userId: number, type: CategoryType): Promise<Category[]> {
        const { rows } = await this.database.query<Category>(
            `SELECT id, title FROM public.categories
              WHERE user_id = $1 AND type = $2 ORDER BY id`,
            [userId, type],
        );
        return rows;
    }

    async findById(userId: number, type: CategoryType, id: number): Promise<Category | null> {
        const { rows } = await this.database.query<Category>(
            `SELECT id, title FROM public.categories
              WHERE user_id = $1 AND type = $2 AND id = $3`,
            [userId, type, id],
        );
        return rows[0] ?? null;
    }

    async findOwnedById(userId: number, id: number): Promise<(Category & { type: CategoryType }) | null> {
        const { rows } = await this.database.query<Category & { type: CategoryType }>(
            `SELECT id, title, type FROM public.categories WHERE user_id = $1 AND id = $2`,
            [userId, id],
        );
        return rows[0] ?? null;
    }

    async create(userId: number, type: CategoryType, title: string): Promise<Category> {
        try {
            const { rows } = await this.database.query<Category>(
                `INSERT INTO public.categories (user_id, type, title, title_normalized)
                 VALUES ($1, $2, $3, $4) RETURNING id, title`,
                [userId, type, title, this.titles.normalize(title)],
            );
            if (rows[0] === undefined) {
                throw new Error('PostgreSQL did not return the created category');
            }
            return rows[0];
        } catch (error) {
            return rethrowWriteError(error);
        }
    }

    async rename(userId: number, type: CategoryType, id: number, title: string): Promise<Category | null> {
        try {
            const { rows } = await this.database.query<Category>(
                `UPDATE public.categories SET title = $4, title_normalized = $5
                  WHERE user_id = $1 AND type = $2 AND id = $3
                  RETURNING id, title`,
                [userId, type, id, title, this.titles.normalize(title)],
            );
            return rows[0] ?? null;
        } catch (error) {
            return rethrowWriteError(error);
        }
    }

    async delete(userId: number, type: CategoryType, id: number): Promise<boolean> {
        try {
            const { rowCount } = await this.database.query(
                `DELETE FROM public.categories WHERE user_id = $1 AND type = $2 AND id = $3`,
                [userId, type, id],
            );
            return rowCount === 1;
        } catch (error) {
            if (typeof error === 'object' && error !== null
                && 'code' in error && error.code === '23503'
                && 'constraint' in error && error.constraint === 'operations_category_fkey') {
                throw new ConflictError('Category has operations');
            }
            throw error;
        }
    }

    async deleteOperations(userId: number, type: CategoryType, categoryId: number): Promise<void> {
        await this.database.query(
            `DELETE FROM public.operations WHERE user_id = $1 AND type = $2 AND category_id = $3`,
            [userId, type, categoryId],
        );
    }

    async moveOperations(
        userId: number, type: CategoryType, categoryId: number, targetCategoryId: number,
    ): Promise<void> {
        try {
            await this.database.query(
                `UPDATE public.operations SET category_id = $4
                  WHERE user_id = $1 AND type = $2 AND category_id = $3`,
                [userId, type, categoryId, targetCategoryId],
            );
        } catch (error) {
            if (typeof error === 'object' && error !== null
                && 'code' in error && error.code === '23503'
                && 'constraint' in error && error.constraint === 'operations_category_fkey') {
                throw new NotFoundError('Target category not found');
            }
            throw error;
        }
    }

    async seedDefaults(userId: number): Promise<void> {
        for (const [type, titles] of Object.entries(STANDARD_CATEGORIES)) {
            await this.database.query(
                `INSERT INTO public.categories (user_id, type, title, title_normalized, is_default)
                 SELECT $1, $2::public.category_type, title, title_normalized, title = 'Общее'
                   FROM unnest($3::text[], $4::text[]) AS seed(title, title_normalized)`,
                [userId, type, titles, titles.map((title) => this.titles.normalize(title))],
            );
        }
    }
}
