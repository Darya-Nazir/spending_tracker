import type { QueryExecutor } from '../../db/database.ts';
import type { CategoryType } from '../categories/category.repository.ts';

export type Operation = {
    id: number;
    type: CategoryType;
    amount: number;
    date: string;
    comment: string;
    category: string;
};

export class OperationRepository {
    readonly #database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.#database = database;
    }

    async list(userId: number): Promise<Operation[]> {
        const { rows } = await this.#database.query<Operation>(
            `select o.id, o.type, o.amount, o.date, o.comment, c.title as category
               from public.operations o
               join public.categories c
                 on c.id = o.category_id and c.user_id = o.user_id and c.type = o.type
              where o.user_id = $1
              order by o.date desc, o.id desc`,
            [userId],
        );
        return rows;
    }
}
