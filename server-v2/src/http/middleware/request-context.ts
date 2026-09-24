import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import type { Logger } from '../../logging/logger.ts';

const REQUEST_ID_HEADER = 'x-request-id';

const MAX_REQUEST_ID_LENGTH = 128;

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]+$/;

declare global {
    namespace Express {
        interface Request {
            /** Идентификатор запроса: значение заголовка x-request-id или сгенерированный UUID. */
            requestId: string;
            /** Логгер с этим requestId в полях. */
            log: Logger;
        }
    }
}

export class RequestContext {
    readonly #logger: Logger;

    constructor(logger: Logger) {
        this.#logger = logger;
    }

    /** Поле со стрелочной функцией, а не метод: express вызывает обработчик без this. */
    readonly attach = (req: Request, res: Response, next: NextFunction): void => {
        const requestId = RequestContext.#resolveId(req.headers[REQUEST_ID_HEADER]);

        req.requestId = requestId;
        req.log = this.#logger.child({ requestId });

        // Тот же идентификатор в ответе: по нему клиент или тестировщик может
        // указать конкретный запрос, а мы найдём его строки в логе.
        res.setHeader(REQUEST_ID_HEADER, requestId);

        RequestContext.#logWhenFinished(req, res);

        next();
    };

    static #logWhenFinished(req: Request, res: Response): void {
        const startedAt = process.hrtime.bigint();

        res.on('finish', () => {
            req.log.info({
                // Порядок полей тот же, что у записей ErrorHandler: строки
                // об одном запросе читаются рядом.
                status: res.statusCode,
                method: req.method,
                url: req.originalUrl,
                durationMs: RequestContext.#elapsedMs(startedAt),
            }, 'request completed');
        });
    }

    /**
     * Монотонные часы, а не Date.now(): системное время может перескочить
     * назад при синхронизации и дать отрицательную длительность.
     */
    static #elapsedMs(startedAt: bigint): number {
        const elapsedNs = process.hrtime.bigint() - startedAt;

        return Number(elapsedNs / 1000n) / 1000;
    }

    static #resolveId(header: string | string[] | undefined): string {
        const incoming = Array.isArray(header) ? header[0] : header;

        if (typeof incoming === 'string') {
            const candidate = incoming.trim();
            const isUsable = candidate.length > 0
                && candidate.length <= MAX_REQUEST_ID_LENGTH
                && SAFE_REQUEST_ID.test(candidate);

            if (isUsable) {
                return candidate;
            }
        }

        return randomUUID();
    }
}
