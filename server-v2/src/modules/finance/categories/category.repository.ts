import type { QueryExecutor } from '../../../db/database.ts';
import type { NormalizedCategoryTitle } from './category-title.service.ts';

export type CategoryType = 'expense' | 'income';

export type Category = {
    id: number;
    type: CategoryType;
    title: string;
    titleNormalized: string | null;
    isDefault: boolean;
};

type CategoryRow = {
    id: number;
    type: CategoryType;
    title: string;
    title_normalized: string | null;
    is_default: boolean;
};

export type NewCategory = {
    type: CategoryType;
    title: string;
    titleNormalized: NormalizedCategoryTitle;
};

	// SQL категорий: чтение по владельцу, создание, отметка системной категории
export class CategoryRepository {
    readonly #database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.#database = database;
    }

    async findAllByUserId(userId: number): Promise<Category[]> {
        const { rows } = await this.#database.query<CategoryRow>(
            `select id, type, title, title_normalized, is_default
               from finance.categories
              where user_id = $1
              order by id`,
            [userId],
        );

        return rows.map(row => ({
            id: row.id,
            type: row.type,
            title: row.title,
            titleNormalized: row.title_normalized,
            isDefault: row.is_default,
        }));
    }

    async create(userId: number, category: NewCategory): Promise<number> {
        const { rows } = await this.#database.query<{ id: number }>(
            `insert into finance.categories (user_id, type, title, title_normalized)
             values ($1, $2, $3, $4)
             returning id`,
            [userId, category.type, category.title, category.titleNormalized],
        );
        const row = rows[0];

        if (row === undefined) {
            throw new Error('PostgreSQL did not return the created category');
        }

        return row.id;
    }

    async markSystem(userId: number, categoryId: number): Promise<void> {
        await this.#database.query(
            `update finance.categories
                set is_default = true
              where user_id = $1 and id = $2 and not is_default`,
            [userId, categoryId],
        );
    }
}
