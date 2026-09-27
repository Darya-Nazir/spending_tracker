import type { QueryExecutor } from '../../db/database.ts';

// одна строка таблицы соответствует одному refresh-токену
// При обновлениях получается цепочка записей: A → B → C
type SessionRow = {
    id: number;
    user_id: number;
    expires_at: Date;
    device: string;
    revoked_at: Date | null;
};

export class SessionRepository {
    private readonly database: QueryExecutor;

    constructor(database: QueryExecutor) {
        this.database = database;
    }

    async create(userId: number, tokenHash: string, expiresAt: Date, device: string): Promise<number> {
        const { rows } = await this.database.query<{ id: number }>(
            `INSERT INTO sessions (user_id, token_hash, expires_at, device)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [userId, tokenHash, expiresAt, device],
        );
        const session = rows[0];
        if (session === undefined) {
            throw new Error('PostgreSQL did not return the created session');
        }
        return session.id;
    }
    
// блокирует строку пользователя до завершения транзакции, 
// чтобы изменения происходилипо очереди
    async lockUser(userId: number): Promise<void> {
        await this.database.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    }

    async findByTokenHash(tokenHash: string): Promise<SessionRow | null> {
        const { rows } = await this.database.query<SessionRow>(
            'SELECT id, user_id, expires_at, device, revoked_at FROM sessions WHERE token_hash = $1',
            [tokenHash],
        );
        return rows[0] ?? null;
    }

// отмечает предыдущую запись отозванной через revoked_at и 
// сохраняет ссылку на новую в replaced_by. там -  id новой строки
    async replace(id: number, replacementId: number): Promise<void> {
        await this.database.query(
            'UPDATE sessions SET revoked_at = now(), replaced_by = $2 WHERE id = $1',
            [id, replacementId],
        );
    }
    
// revoke - отозвать
// работает с одной цепочкой, привязанной к одному session id из одного refresh-токена.  
// Одна цепочка id-ков, связанных через replaced_by, соответствует одному устройству.
// Сессии других устройств того же пользователя не затрагиваются.
    async revokeChain(id: number): Promise<void> {
        await this.database.query(
            `WITH RECURSIVE chain AS (
                SELECT id, replaced_by FROM sessions WHERE id = $1
                UNION ALL
                SELECT s.id, s.replaced_by FROM sessions s
                JOIN chain c ON s.id = c.replaced_by
             )
             UPDATE sessions SET revoked_at = now()
             WHERE id IN (SELECT id FROM chain) AND revoked_at IS NULL`,
            [id],
        );
    }
}
