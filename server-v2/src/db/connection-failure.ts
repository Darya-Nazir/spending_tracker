/**
 * Отличает недоступное соединение от ошибки в самом запросе
 *
 * Сетевые отказы приходят от Node кодами errno. PostgreSQL отвечает классом
 * SQLSTATE 08 (connection exception) и 57P03, когда база ещё поднимается.
 * Ожидание свободного клиента pg сообщает только текстом.
 */

const ERRNO_CODES = new Set([
    'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'EPIPE',
]);

const CANNOT_CONNECT_NOW = '57P03';

const POOL_TIMEOUT = 'timeout exceeded when trying to connect';

export const isConnectionFailure = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
        return false;
    }

    const code = (error as { code?: unknown }).code;

    if (typeof code === 'string'
        && (ERRNO_CODES.has(code) || code.startsWith('08') || code === CANNOT_CONNECT_NOW)) {
        return true;
    }

    return error.message.includes(POOL_TIMEOUT);
};
