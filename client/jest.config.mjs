export default {
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
        '\\.(html)$': 'jest-transform-stub'
    },
    setupFiles: ['<rootDir>/jest.setup.js'],
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.test.js'],
    moduleFileExtensions: ['js', 'ts', 'tsx', 'json', 'html'],
    testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons'],
        url: 'http://localhost'
    },
    transformIgnorePatterns: [
        'node_modules/(?!(msw|yargs|yargs-parser|@mswjs|text-encoding-utf-8|web-streams-polyfill|whatwg-fetch)/)'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
        '^.+\\.js$': 'babel-jest',
        '^.+\\.html?$': 'jest-transform-stub'
    },
    testMatch: [
        "**/__tests__/**/*.(spec|test).js"
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "/__tests__/fixtures/",
        "/__tests__/mocks/setup.js"
    ],
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    globals: { 'ts-jest': { useESM: true, }, },
}