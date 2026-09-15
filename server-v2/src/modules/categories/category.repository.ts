import type { QueryExecutor } from '../../db/database.ts';
import { ConflictError } from '../../errors/app-error.ts';
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
        && (error.constraint === 'categories_user_type_title_normalized_unique'
            || error.constraint === 'categories_user_type_title_lower_unique')) {
        throw new ConflictError('Category with given title already exists');
    }
    throw error;
};

export class CategoryRepository {
    readonly #database: QueryExecutor;
    readonly #titles = new CategoryTitleService();

    constructor(database: QueryExecutor) {
        this.#database = database;
    }

    async list(userId: number, type: CategoryType): Promise<Category[]> {
        const { rows } = await this.#database.query<Category>(
            `select id, title from public.categories
              where user_id = $1 and type = $2 order by id`,
            [userId, type],
        );
        return rows;
    }

    async findById(userId: number, type: CategoryType, id: number): Promise<Category | null> {
        const { rows } = await this.#database.query<Category>(
            `select id, title from public.categories
              where user_id = $1 and type = $2 and id = $3`,
            [userId, type, id],
        );
        return rows[0] ?? null;
    }

    async create(userId: number, type: CategoryType, title: string): Promise<Category> {
        try {
            const { rows } = await this.#database.query<Category>(
                `insert into public.categories (user_id, type, title, title_normalized)
                 values ($1, $2, $3, $4) returning id, title`,
                [userId, type, title, this.#titles.normalize(title)],
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
            const { rows } = await this.#database.query<Category>(
                `update public.categories set title = $4, title_normalized = $5
                  where user_id = $1 and type = $2 and id = $3
                  returning id, title`,
                [userId, type, id, title, this.#titles.normalize(title)],
            );
            return rows[0] ?? null;
        } catch (error) {
            return rethrowWriteError(error);
        }
    }

    async seedDefaults(userId: number): Promise<void> {
        for (const [type, titles] of Object.entries(STANDARD_CATEGORIES)) {
            await this.#database.query(
                `insert into public.categories (user_id, type, title, title_normalized, is_default)
                 select $1, $2::public.category_type, title, title_normalized, title = 'Общее'
                   from unnest($3::text[], $4::text[]) as seed(title, title_normalized)`,
                [userId, type, titles, titles.map((title) => this.#titles.normalize(title))],
            );
        }
    }
}
