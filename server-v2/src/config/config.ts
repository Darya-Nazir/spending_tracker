import { z } from 'zod';

/**
 * Чтение и проверка переменных окружения. Больше нигде в коде process.env
 * не читается.
 *
 * Проверка выполняется один раз при старте: если переменных не хватает или
 * значения некорректны, Config.load() бросает ошибку со списком всех проблем,
 * и процесс не поднимается.
 *
 * В схеме находятся только те переменные, которые уже кем-то читаются.
 * Остальные закомментированы, у каждой указан этап, на котором она включится.
 */

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\/.+/;

const HTTP_URL_PATTERN = /^https?:\/\/[^\s/]+$/;

type TokenTtl = `${number}${'s' | 'm' | 'h' | 'd'}`;
const TTL_PATTERN = /^[1-9]\d*[smhd]$/;

const ttl = (name: string, fallback: TokenTtl) => z
    .string()
    .regex(TTL_PATTERN, `${name} must look like 15m, 2h, 1d or 30s and be positive`)
    .default(fallback)
    .transform((value) => value as TokenTtl);

// --- этап 19 (фильтры периода) ---
// const isKnownTimezone = (value: string): boolean => {
//     try {
//         new Intl.DateTimeFormat('en-US', { timeZone: value });
//         return true;
//     } catch {
//         return false;
//     }
// };

const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),

    PORT: z.coerce
        .number()
        .int('PORT must be a whole number')
        .min(1, 'PORT must be between 1 and 65535')
        .max(65535, 'PORT must be between 1 and 65535')
        .default(3000),

    LOG_LEVEL: z
        .enum(LOG_LEVELS, `LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}`)
        .default('info'),

    // Адрес базы, с которой работает приложение. Второй переменной под
    // тестовую базу в схеме нет: прогон тестов и db:migrate:test передают
    // адрес spending_test в этой же переменной (этапы 6–7).
    DATABASE_URL: z
        .string()
        .regex(
            POSTGRES_URL_PATTERN,
            'DATABASE_URL must be a postgres:// or postgresql:// connection string',
        ),

    CORS_ORIGIN: z
        .string()
        .regex(HTTP_URL_PATTERN, 'CORS_ORIGIN must be an http(s) origin')
        .default('http://localhost:9000'),

    // Старый сервер вызывал bcrypt.genSalt(Number('example')), то есть genSalt(NaN).
    // Проверка на целое число не меньше 10 не даёт передать сюда NaN.
    BCRYPT_COST: z.coerce
        .number()
        .int('BCRYPT_COST must be a whole number')
        .min(10, 'BCRYPT_COST must be at least 10')
        .max(31, 'BCRYPT_COST must be at most 31')
        .default(12),

    JWT_ACCESS_SECRET: z
        .string()
        .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),

    JWT_REFRESH_SECRET: z
        .string()
        .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

    ACCESS_TTL: ttl('ACCESS_TTL', '15m'),
    REFRESH_TTL: ttl('REFRESH_TTL', '30d'),

    // --- этап 19 (фильтры периода) ---
    // Таймзона, в которой вычисляются границы today, week, month, year.
    // APP_TZ: z
    //     .string()
    //     .refine(isKnownTimezone, 'APP_TZ must be a timezone this runtime knows, e.g. Asia/Almaty')
    //     .default('UTC'),
}).refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
    message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
    path: ['JWT_REFRESH_SECRET'],
});

/** Разобранное окружение. Тип выводится из схемы, руками не описывается. */
type ParsedEnv = z.infer<typeof envSchema>;

/** Окружение до разбора: в process.env значения либо строки, либо undefined. */
export type RawEnv = Record<string, string | undefined>;

export type NodeEnv = ParsedEnv['NODE_ENV'];
export type LogLevel = ParsedEnv['LOG_LEVEL'];

export class Config {
    readonly nodeEnv: NodeEnv;
    readonly port: number;
    readonly logLevel: LogLevel;

    // Вычисленные один раз флаги, чтобы в остальном коде не сравнивать строки.
    readonly isDevelopment: boolean;
    readonly isTest: boolean;
    readonly isProduction: boolean;

    readonly databaseUrl: string;

    readonly corsOrigin: string;

    readonly bcryptCost: number;

    readonly jwt: Readonly<{
        accessSecret: string;
        refreshSecret: string;
        accessTtl: TokenTtl;
        refreshTtl: TokenTtl;
    }>;

    // --- этап 19 ---
    // readonly appTz: string;

    /**
     * @param env по умолчанию process.env. Тесты передают окружение
     *   аргументом, поэтому им не нужно менять process.env.
     * @throws Error со списком всех недостающих и некорректных переменных.
     */
    static load(env: RawEnv = process.env): Config {
        const result = envSchema.safeParse(env);

        if (!result.success) {
            throw new Error(Config.#describe(result.error));
        }

        return new Config(result.data);
    }

    static #describe(error: z.ZodError): string {
        const lines = error.issues.map((issue) => {
            const name = issue.path.join('.') || '(environment)';
            return `  - ${name}: ${issue.message}`;
        });

        return [
            'Invalid environment configuration:',
            ...lines,
            '',
            'See .env.example for the expected shape.',
        ].join('\n');
    }

    constructor(values: ParsedEnv) {
        this.nodeEnv = values.NODE_ENV;
        this.port = values.PORT;
        this.logLevel = values.LOG_LEVEL;

        this.databaseUrl = values.DATABASE_URL;

        this.corsOrigin = values.CORS_ORIGIN;

        this.bcryptCost = values.BCRYPT_COST;

        this.jwt = Object.freeze({
            accessSecret: values.JWT_ACCESS_SECRET,
            refreshSecret: values.JWT_REFRESH_SECRET,
            accessTtl: values.ACCESS_TTL,
            refreshTtl: values.REFRESH_TTL,
        });

        // --- этап 19 ---
        // this.appTz = values.APP_TZ;

        this.isDevelopment = this.nodeEnv === 'development';
        this.isTest = this.nodeEnv === 'test';
        this.isProduction = this.nodeEnv === 'production';

        // readonly проверяется при компиляции, Object.freeze — при выполнении.
        Object.freeze(this);
    }
}
