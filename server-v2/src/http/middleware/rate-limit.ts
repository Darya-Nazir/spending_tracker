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
    private readonly windowMs: number;
    private readonly max: number;
    private readonly keyFor: (req: Request) => string;
    private readonly message: string;
    private readonly countOn: (statusCode: number) => boolean;
    private readonly hits = new Map<string, WindowEntry>();
    private nextCleanupAt: number;

    constructor(options: RateLimitOptions) {
        this.windowMs = options.windowMs;
        this.max = options.max;
        this.keyFor = options.keyFor;
        this.message = options.message;
        this.countOn = options.countOn ?? (() => true);
        this.nextCleanupAt = Date.now() + this.windowMs;
    }

    readonly check = (req: Request, res: Response, next: NextFunction): void => {
        const key = this.keyFor(req);
        const now = Date.now();
        this.deleteExpired(now);
        const entry = this.hits.get(key);
        const active = entry !== undefined && now < entry.resetAt ? entry : undefined;

        if (active !== undefined && active.count >= this.max) {
            next(new TooManyRequestsError(this.message));
            return;
        }

        res.once('finish', () => {
            if (!this.countOn(res.statusCode)) return;

            const current = this.hits.get(key);
            if (current === undefined || Date.now() >= current.resetAt) {
                this.hits.set(key, { count: 1, resetAt: Date.now() + this.windowMs });
            } else {
                current.count += 1;
            }
        });

        next();
    };

    private deleteExpired(now: number): void {
        if (now < this.nextCleanupAt) return;

        for (const [key, entry] of this.hits) {
            if (now >= entry.resetAt) this.hits.delete(key);
        }
        this.nextCleanupAt = now + this.windowMs;
    }
}
// Термин «key» здесь — из пары key-value
export const loginRateLimitKey = (req: Request): string => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
    return `${email}:${req.ip}`;
};

export const ipRateLimitKey = (req: Request): string => req.ip ?? 'unknown';
