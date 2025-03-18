export default {
    testEnvironment: 'jest-fixed-jsdom',
    moduleNameMapper: {
        '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
        '\\.(html)$': 'jest-transform-stub'
    },
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.test.ts'],
    moduleFileExtensions: ['js', 'ts', 'json', 'html'],
    transform: {
        '^.+\\.html?$': 'jest-transform-stub',
        // Add TypeScript transformation with options
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.jest.json',
            useESM: true
        }]
    },
    testMatch: [
        "**/__tests__/**/*.(spec|test).ts"
    ],
    // Игнорируем вспомогательные файлы
    testPathIgnorePatterns: [
        "/node_modules/",
        "/__tests__/fixtures/",
        "/__tests__/mocks/",
        "/__tests__/setup.test.ts"
    ],
    extensionsToTreatAsEsm: ['.ts']
};