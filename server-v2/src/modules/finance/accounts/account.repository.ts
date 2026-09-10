import type { QueryExecutor } from '../../../db/database.ts';

export class AccountRepository {
    readonly #database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.#database = database;
    }

    /** Повторное создание сохраняет баланс и статус готового аккаунта. */
    async create(userId: number): Promise<void> {
        await this.#database.query(
            `insert into finance.accounts (user_id) values ($1)
             on conflict (user_id) do nothing`,
            [userId],
        );
    }

    /** Удаляет аккаунт вместе с его категориями и операциями через каскад finance. */
    async deleteByUserId(userId: number): Promise<void> {
        await this.#database.query('delete from finance.accounts where user_id = $1', [userId]);
    }
}
