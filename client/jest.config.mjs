export default {
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
        '\\.(html)$': 'jest-transform-stub'
    },
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.test.js'],
    setupFiles: ['<rootDir>/jest.setup.js'],
    moduleFileExtensions: ['js', 'ts', 'tsx', 'json', 'html'],
    testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons'],
        url: 'http://localhost'
    },
    extensionsToTreatAsEsm:  ['.ts', '.tsx'],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            useESM: true,
            isolatedModules: true
        }],
        '^.+\\.(js|jsx|mjs)$': ['babel-jest', { rootMode: 'upward' }],
        '^.+\\.html?$': 'jest-transform-stub'
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(msw|yargs|yargs-parser|@mswjs|text-encoding-utf-8|web-streams-polyfill|whatwg-fetch)/)'
    ],
    testMatch: [
        "**/__tests__/**/*.(spec|test).js",
        "**/__tests__/**/*.(spec|test).ts"
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "/__tests__/fixtures/",
        "/__tests__/mocks/setup.js"
    ]
};