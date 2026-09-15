import type { QueryExecutor } from '../../db/database.ts';
import { CategoryTitleService } from './category-title.service.ts';

const STANDARD_CATEGORIES = {
    expense: ['Еда', 'Жилье', 'Здоровье', 'Кафе', 'Авто', 'Одежда', 'Развлечения', 'Счета', 'Спорт', 'Общее'],
    income: ['Депозиты', 'Зарплата', 'Сбережения', 'Инвестиции', 'Общее'],
};

export class CategoryRepository {
    readonly #database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.#database = database;
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
