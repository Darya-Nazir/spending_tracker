import type { QueryExecutor } from '../../../db/database.ts';

export class AccountRepository {
    readonly #database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.#database = database;
    }

    /**
     * Аккаунт может быть уже создан слоем совместимости миграции 008
     * или предыдущей попыткой подготовки. Готовые данные сохраняются.
     */
    async create(userId: number): Promise<void> {
        await this.#database.query(
            `insert into finance.accounts (user_id) values ($1)
             on conflict (user_id) do nothing`,
            [userId],
        );
    }
}
