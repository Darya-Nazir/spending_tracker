import type { QueryExecutor } from '../../../db/database.ts';

export type AccountStatus = 'pending' | 'ready' | 'failed';

// работа с  колонкой status в finance.accounts
export class AccountRepository {
    readonly #database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.#database = database;
    }

    /** Статус аккаунта; null означает, что строки ещё нет. */
    async findStatusByUserId(userId: number): Promise<AccountStatus | null> {
        const { rows } = await this.#database.query<{ status: AccountStatus }>(
            'select status from finance.accounts where user_id = $1',
            [userId],
        );

        return rows[0]?.status ?? null;
    }

    async create(userId: number): Promise<void> {
        await this.#database.query(
            `insert into finance.accounts (user_id) values ($1)
             on conflict (user_id) do nothing`,
            [userId],
        );
    }

// создаёт строку со значением по умолчанию pending и возвращает текущий статус
    async createAndLock(userId: number): Promise<AccountStatus> {
        const { rows } = await this.#database.query<{ status: AccountStatus }>(
            `insert into finance.accounts (user_id) values ($1)
             on conflict (user_id) do update set user_id = excluded.user_id
             returning status`,
            [userId],
        );
        const row = rows[0];

        if (row === undefined) {
            throw new Error('PostgreSQL did not return the financial account status');
        }

        return row.status;
    }
// закрывает транзакцию
    async markReady(userId: number): Promise<void> {
        await this.#database.query(
            "update finance.accounts set status = 'ready', status_reason = null where user_id = $1",
            [userId],
        );
    }

    /** Подготовка исчерпала попытки: причина хранится рядом со статусом. */
    async markFailed(userId: number, reason: string): Promise<void> {
        await this.#database.query(
            `insert into finance.accounts (user_id, status, status_reason) values ($1, 'failed', $2)
             on conflict (user_id) do update
                set status = 'failed', status_reason = excluded.status_reason
              where finance.accounts.status <> 'ready'`,
            [userId, reason],
        );
    }

    /** Удаляет аккаунт вместе с его категориями и операциями через каскад finance. */
    async deleteByUserId(userId: number): Promise<void> {
        await this.#database.query('delete from finance.accounts where user_id = $1', [userId]);
    }
}
