import type { QueryExecutor } from '../../db/database.ts';

export class BalanceRepository {
    private readonly database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.database = database;
    }

    async get(userId: number): Promise<number | null> {
        const { rows } = await this.database.query<{ balance: number }>(
            `select initial_balance + coalesce(
                (select sum(case when type = 'income' then amount else -amount end)
                   from public.operations where user_id = $1), 0
             ) as balance
               from public.users where id = $1`,
            [userId],
        );
        return rows[0]?.balance ?? null;
    }

    async update(userId: number, balance: number): Promise<number | null> {
        const { rows } = await this.database.query<{ balance: number }>(
            `with updated as (
                update public.users set initial_balance = $2 where id = $1
                returning id, initial_balance
             )
             select updated.initial_balance + coalesce(
                 (select sum(case when type = 'income' then amount else -amount end)
                    from public.operations where user_id = updated.id), 0
             ) as balance
               from updated`,
            [userId, balance],
        );
        return rows[0]?.balance ?? null;
    }
}
