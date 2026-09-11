import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { Config, type RawEnv } from '../../src/config/config.ts';

/**
 * Config.load() принимает окружение аргументом, поэтому тесты передают его
 * явно и не меняют process.env.
 */
const validEnv: Readonly<RawEnv> = Object.freeze({
    NODE_ENV: 'test',
    PORT: '3000',
    LOG_LEVEL: 'debug',
    DATABASE_URL: 'postgres://spending:spending@localhost:5432/spending_test',
    IDENTITY_DATABASE_URL: 'postgres://identity_app:secret@localhost:5432/spending_test',
    FINANCE_DATABASE_URL: 'postgres://finance_app:secret@localhost:5432/spending_test',
    BCRYPT_COST: '11',
    JWT_ACCESS_SECRET: 'test-access-secret-with-enough-length',
    JWT_REFRESH_SECRET: 'test-refresh-secret-with-enough-length',
});

const envWith = (patch: RawEnv): RawEnv => ({ ...validEnv, ...patch });

const envWithout = (...keys: string[]): RawEnv => {
    const env: RawEnv = { ...validEnv };
    for (const key of keys) {
        delete env[key];
    }
    return env;
};

describe('Config', () => {

    test('reads every variable off the supplied environment', () => {
        // читает каждую переменную из переданного окружения
        const config = Config.load(validEnv);

        assert.equal(config.nodeEnv, 'test');
        assert.equal(config.port, 3000);
        assert.equal(config.logLevel, 'debug');
        assert.equal(config.databaseUrl, 'postgres://spending:spending@localhost:5432/spending_test');
        assert.equal(config.moduleDatabaseUrls.identity, validEnv.IDENTITY_DATABASE_URL);
        assert.equal(config.moduleDatabaseUrls.finance, validEnv.FINANCE_DATABASE_URL);
        assert.equal(config.bcryptCost, 11);
        assert.equal(config.jwt.accessSecret, validEnv.JWT_ACCESS_SECRET);
        assert.equal(config.jwt.refreshSecret, validEnv.JWT_REFRESH_SECRET);
    });

    test('applies a default to every optional variable', () => {
        // подставляет значение по умолчанию каждой необязательной переменной
        const config = Config.load(envWithout('NODE_ENV', 'PORT', 'LOG_LEVEL', 'BCRYPT_COST'));

        assert.equal(config.nodeEnv, 'development');
        assert.equal(config.port, 3000);
        assert.equal(config.logLevel, 'info');
        assert.equal(config.bcryptCost, 12);
        assert.equal(config.jwt.accessTtl, '15m');
        assert.equal(config.jwt.refreshTtl, '30d');
        assert.equal(config.corsOrigin, 'http://localhost:9000');
    });

    test('validates token lifetimes and the browser origin', () => {
        // проверяет сроки токенов и источник браузерных запросов
        const config = Config.load(envWith({ ACCESS_TTL: '10s', REFRESH_TTL: '2h', CORS_ORIGIN: 'https://tracker.example' }));
        assert.equal(config.jwt.accessTtl, '10s');
        assert.equal(config.jwt.refreshTtl, '2h');
        assert.equal(config.corsOrigin, 'https://tracker.example');
        for (const key of ['ACCESS_TTL', 'REFRESH_TTL']) {
            for (const value of ['0s', '-1m', '15', '1y', '1.5h']) {
                assert.throws(() => Config.load(envWith({ [key]: value })), new RegExp(key));
            }
        }
        assert.throws(() => Config.load(envWith({ CORS_ORIGIN: 'localhost:9000' })), /CORS_ORIGIN/);
    });

    test('fails when any database URL is missing or malformed', () => {
        // падает, если любого адреса базы нет или он не похож на строку подключения
        for (const key of ['DATABASE_URL', 'IDENTITY_DATABASE_URL', 'FINANCE_DATABASE_URL']) {
            assert.throws(() => Config.load(envWithout(key)), new RegExp(key));
            assert.throws(() => Config.load(envWith({ [key]: 'localhost:5432' })), new RegExp(key));
        }
    });

    test('fails when a JWT secret is missing, too short or equal to the other', () => {
        // падает, если JWT-секрета нет, он короче 32 символов или совпадает со вторым
        assert.throws(() => Config.load(envWithout('JWT_ACCESS_SECRET')), /JWT_ACCESS_SECRET/);
        assert.throws(() => Config.load(envWithout('JWT_REFRESH_SECRET')), /JWT_REFRESH_SECRET/);
        assert.throws(() => Config.load(envWith({ JWT_ACCESS_SECRET: 'too-short' })), /JWT_ACCESS_SECRET/);

        // Если в настройках указали один ключ для обоих видов токенов,
        // загрузка конфигурации должна завершиться ошибкой
        assert.throws(
            () => Config.load(envWith({ JWT_REFRESH_SECRET: validEnv.JWT_ACCESS_SECRET })),
            /JWT_REFRESH_SECRET/,
        );
    });

    test('rejects invalid values, naming every offending variable at once', () => {
        // отвергает некорректные значения, называя все проблемные переменные сразу
        assert.throws(() => Config.load(envWith({ NODE_ENV: 'staging' })), /NODE_ENV/);
        assert.throws(() => Config.load(envWith({ PORT: 'nope' })), /PORT/);
        assert.throws(() => Config.load(envWith({ PORT: '70000' })), /PORT/);
        assert.throws(() => Config.load(envWith({ LOG_LEVEL: 'verbose' })), /LOG_LEVEL/);

        let message = '';
        try {
            Config.load(envWith({ NODE_ENV: 'staging', PORT: 'nope' }));
        } catch (error) {
            message = (error as Error).message;
        }

        assert.match(message, /NODE_ENV/);
        assert.match(message, /PORT/);
    });
});
