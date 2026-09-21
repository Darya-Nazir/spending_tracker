import type { NextFunction, Request, Response } from 'express';

import { TooManyRequestsError } from '../../errors/app-error.ts';

type WindowEntry = {
    count: number;
    resetAt: number;
};

export type RateLimitOptions = Readonly<{
    windowMs: number;
    max: number;
    keyFor: (req: Request) => string;
    message: string;
    countOn?: (statusCode: number) => boolean;
}>;

// лимитер ограничивает попытки, лько если совпадают емейл и IP
export class RateLimiter {
    readonly #windowMs: number;
    readonly #max: number;
    readonly #keyFor: (req: Request) => string;
    readonly #message: string;
    readonly #countOn: (statusCode: number) => boolean;
    readonly #hits = new Map<string, WindowEntry>();

    constructor(options: RateLimitOptions) {
        this.#windowMs = options.windowMs;
        this.#max = options.max;
        this.#keyFor = options.keyFor;
        this.#message = options.message;
        this.#countOn = options.countOn ?? (() => true);
    }

    readonly check = (req: Request, res: Response, next: NextFunction): void => {
        const key = this.#keyFor(req);
        const now = Date.now();
        const entry = this.#hits.get(key);
        const active = entry !== undefined && now < entry.resetAt ? entry : undefined;

        if (active !== undefined && active.count >= this.#max) {
            next(new TooManyRequestsError(this.#message));
            return;
        }

        res.once('finish', () => {
            if (!this.#countOn(res.statusCode)) return;

            const current = this.#hits.get(key);
            if (current === undefined || Date.now() >= current.resetAt) {
                this.#hits.set(key, { count: 1, resetAt: Date.now() + this.#windowMs });
            } else {
                current.count += 1;
            }
        });

        next();
    };
}
// Термин «key» здесь — из пары key-value
export const loginRateLimitKey = (req: Request): string => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
    return `${email}:${req.ip}`;
};

export const ipRateLimitKey = (req: Request): string => req.ip ?? 'unknown';
