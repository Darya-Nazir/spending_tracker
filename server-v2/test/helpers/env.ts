import type { RawEnv } from '../../src/config/config.ts';

const DATABASE_URL = 'postgres://spending:spending@localhost:5432/spending_test';

export const testEnv = (patch: RawEnv = {}): RawEnv => ({
    NODE_ENV: 'test',
    PORT: '3000',
    LOG_LEVEL: 'debug',
    DATABASE_URL,
    IDENTITY_DATABASE_URL: DATABASE_URL,
    FINANCE_DATABASE_URL: DATABASE_URL,
    JWT_ACCESS_SECRET: 'test-access-secret-with-enough-length',
    JWT_REFRESH_SECRET: 'test-refresh-secret-with-enough-length',
    ...patch,
});
