import type { Database } from '../../../db/database.ts';

export class BalanceRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async findByUserId(userId: number): Promise<number | null> {
        // PostgreSQL считает суммы в numeric; Database преобразует результат в число.
        const { rows } = await this.#database.query<{ balance: number }>(
            `select a.initial_balance + coalesce((
                select sum(case when o.type = 'income' then o.amount else -o.amount end)
                  from finance.operations o
                 where o.user_id = a.user_id
            ), 0) as balance
               from finance.accounts a
              where a.user_id = $1`,
            [userId],
        );
        return rows[0]?.balance ?? null;
    }
}
