import type { QueryExecutor } from '../../db/database.ts';

export class BalanceRepository {
    private readonly database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.database = database;
    }

    async get(userId: number): Promise<number | null> {
        const { rows } = await this.database.query<{ balance: number }>(
            `SELECT initial_balance + coalesce(
                (SELECT sum(CASE WHEN type = 'income' THEN amount ELSE -amount END)
                   FROM public.operations WHERE user_id = $1), 0
             ) AS balance
               FROM public.users WHERE id = $1`,
            [userId],
        );
        return rows[0]?.balance ?? null;
    }

    async update(userId: number, balance: number): Promise<number | null> {
        const { rows } = await this.database.query<{ balance: number }>(
            `WITH updated AS (
                UPDATE public.users SET initial_balance = $2 WHERE id = $1
                RETURNING id, initial_balance
             )
             SELECT updated.initial_balance + coalesce(
                 (SELECT sum(CASE WHEN type = 'income' THEN amount ELSE -amount END)
                    FROM public.operations WHERE user_id = updated.id), 0
             ) AS balance
               FROM updated`,
            [userId, balance],
        );
        return rows[0]?.balance ?? null;
    }
}
