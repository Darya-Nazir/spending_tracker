import type { QueryExecutor } from '../../db/database.ts';
import { CategoryTitleService } from './category-title.service.ts';

const STANDARD_CATEGORIES = {
    expense: ['Еда', 'Жилье', 'Здоровье', 'Кафе', 'Авто', 'Одежда', 'Развлечения', 'Счета', 'Спорт', 'Общее'],
    income: ['Депозиты', 'Зарплата', 'Сбережения', 'Инвестиции', 'Общее'],
};

export type CategoryType = keyof typeof STANDARD_CATEGORIES;
export type Category = { id: number; title: string };

export class CategoryRepository {
    readonly #database: QueryExecutor;

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

    async seedDefaults(userId: number): Promise<void> {
        const normalizer = new CategoryTitleService();
        for (const [type, titles] of Object.entries(STANDARD_CATEGORIES)) {
            await this.#database.query(
                `insert into public.categories (user_id, type, title, title_normalized, is_default)
                 select $1, $2::public.category_type, title, title_normalized, title = 'Общее'
                   from unnest($3::text[], $4::text[]) as seed(title, title_normalized)`,
                [userId, type, titles, titles.map((title) => normalizer.normalize(title))],
            );
        }
    }
}
