import { Pool, types as pgTypes, type QueryResult, type QueryResultRow } from 'pg';

import type { Logger } from '../logging/logger.ts';

/**
 * Единственная точка приложения, через которую вызывается драйвер и создаётся pg.Pool. 
 * Репозитории получают этот объект и вызывают query()
 */

const PING = 'select 1';

export interface QueryExecutor {
    query<T extends QueryResultRow = QueryResultRow>(
        sql: string,
        params?: readonly unknown[],
    ): Promise<QueryResult<T>>;
}

// Денежные поля ограничены numeric(14,2) и безопасно помещаются в Number.
pgTypes.setTypeParser(1700, (value) => Number(value));

// Дату без времени сохраняем строкой, чтобы часовой пояс не менял день.
pgTypes.setTypeParser(1082, (value) => value);

export class Database {
    readonly #pool: Pool;
    readonly #logger: Logger;

    readonly name: string;

    constructor(connectionString: string, logger: Logger, name = 'admin') {
        this.name = name;
        this.#logger = logger.child({ db: name });

        // Соединение открывается при первом query()
        this.#pool = new Pool({ connectionString });

        // Событие означает, что первое физическое
        // соединение с PostgreSQL действительно установлено.
        this.#pool.once('connect', () => {
            this.#logger.info('database connected');
        });

        this.#pool.on('error', (error) => {
            this.#logger.error({ err: error }, 'idle database client failed');
        });
    }

    // запрос
    async query<T extends QueryResultRow = QueryResultRow>(
        sql: string, //обычная строка с SQL-запросом
        params: readonly unknown[] = [], //значения, которые PostgreSQL подставляет вместо $1, $2 и тд
    ): Promise<QueryResult<T>> {
        return this.#pool.query<T>(sql, [...params]);
    }

    async transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T> {
        const client = await this.#pool.connect();
        // позволяет выполнить создание пользователя и финансового аккаунта в одной транзакции
        const executor: QueryExecutor = {
            query: (sql, params = []) => client.query(sql, [...params]),
        };
        try {
            await client.query('begin');
            const result = await work(executor);
            await client.query('commit');
            return result;
        } catch (error) {
            await client.query('rollback');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Отвечает ли база на PING-запрос. Используется для /ready
     */
    async isReachable(): Promise<boolean> {
        try {
            await this.query(PING);

            return true;
        } catch (error) {
            // warn, а не error: недоступная база — предусмотренный ответ 503
            this.#logger.warn({ err: error }, 'database is not reachable');

            return false;
        }
    }

    /**
     * Закрывает все соединения пула
     */
    async close(): Promise<void> {
        await this.#pool.end();
    }
}
