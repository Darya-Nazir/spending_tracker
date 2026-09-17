import type { QueryExecutor } from '../../db/database.ts';
import { NotFoundError } from '../../errors/app-error.ts';
import type { CategoryType } from '../categories/category.repository.ts';
import type { DateRange } from './period.ts';

export type Operation = {
    id: number;
    type: CategoryType;
    amount: number;
    date: string;
    comment: string;
    category: string;
};

/** Строка, которую отдаёт INSERT: без category, её добавляет OperationMapper. */
export type InsertedOperation = Omit<Operation, 'category'>;

export class OperationRepository {
    readonly #database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.#database = database;
    }

    async list(userId: number, range: DateRange | null): Promise<Operation[]> {
        const { rows } = await this.#database.query<Operation>(
            `select o.id, o.type, o.amount, o.date, o.comment, c.title as category
               from public.operations o
               join public.categories c
                 on c.id = o.category_id and c.user_id = o.user_id and c.type = o.type
              where o.user_id = $1
                and ($2::date is null or o.date >= $2::date)
                and ($3::date is null or o.date <= $3::date)
              order by o.date desc, o.id desc`,
            [userId, range?.dateFrom ?? null, range?.dateTo ?? null],
        );
        return rows;
    }

    async create(
        userId: number, categoryId: number, type: CategoryType, amount: number, date: string, comment: string,
    ): Promise<InsertedOperation> {
        try {
            const { rows } = await this.#database.query<InsertedOperation>(
                `insert into public.operations (user_id, category_id, type, amount, date, comment)
                 values ($1, $2, $3, $4, $5, $6)
                 returning id, type, amount, date, comment`,
                [userId, categoryId, type, amount, date, comment],
            );
            if (rows[0] === undefined) {
                throw new Error('PostgreSQL did not return the created operation');
            }
            return rows[0];
        } catch (error) {
            // Категорию удалили между проверкой в сервисе и этим INSERT — составной FK
            // (user_id, category_id, type) -> categories(user_id, id, type) из миграции 015 это ловит.
            if (typeof error === 'object' && error !== null
                && 'code' in error && error.code === '23503'
                && 'constraint' in error && error.constraint === 'operations_category_fkey') {
                throw new NotFoundError('Category not found');
            }
            throw error;
        }
    }
}
