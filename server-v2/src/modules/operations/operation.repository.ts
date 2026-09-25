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

export type InsertedOperation = Omit<Operation, 'category'>;

export class OperationRepository {
    private readonly database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.database = database;
    }

    async findOwnedById(userId: number, id: number): Promise<Operation | null> {
        const { rows } = await this.database.query<Operation>(
            `select o.id, o.type, o.amount, o.date, o.comment, c.title as category
               from public.operations o
               join public.categories c
                 on c.id = o.category_id and c.user_id = o.user_id and c.type = o.type
              where o.user_id = $1 and o.id = $2`,
            [userId, id],
        );
        return rows[0] ?? null;
    }

    async list(userId: number, range: DateRange | null): Promise<Operation[]> {
        const { rows } = await this.database.query<Operation>(
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
            const { rows } = await this.database.query<InsertedOperation>(
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
            throw OperationRepository.asCategoryNotFound(error);
        }
    }

    async update(
        userId: number, id: number, categoryId: number, type: CategoryType, amount: number, date: string,
        comment: string,
    ): Promise<InsertedOperation | null> {
        try {
            const { rows } = await this.database.query<InsertedOperation>(
                `update public.operations
                    set category_id = $3, type = $4, amount = $5, date = $6, comment = $7
                  where user_id = $1 and id = $2
                 returning id, type, amount, date, comment`,
                [userId, id, categoryId, type, amount, date, comment],
            );
            return rows[0] ?? null;
        } catch (error) {
            throw OperationRepository.asCategoryNotFound(error);
        }
    }

    /** true — строка была и удалена, false — такой операции у пользователя нет. */
    async delete(userId: number, id: number): Promise<boolean> {
        const { rows } = await this.database.query(
            'delete from public.operations where user_id = $1 and id = $2 returning id',
            [userId, id],
        );
        return rows.length > 0;
    }

    private static asCategoryNotFound(error: unknown): unknown {
        if (typeof error === 'object' && error !== null
            && 'code' in error && error.code === '23503'
            && 'constraint' in error && error.constraint === 'operations_category_fkey') {
            return new NotFoundError('Category not found');
        }
        return error;
    }
}
