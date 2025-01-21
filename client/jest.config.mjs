export default {
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
        '\\.(html)$': 'jest-transform-stub'
    },
    setupFilesAfterEnv: ['<rootDir>/__tests__/setupTests.js'],
    moduleFileExtensions: ['js', 'json', 'html'],
    testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
    transformIgnorePatterns: [
        'node_modules/(?!(yargs|yargs-parser)/)'
    ],
    transform: {
        // Добавляем трансформацию для HTML
        '^.+\\.html?$': 'jest-transform-stub'
    },
    testMatch: [
        "**/__tests__/**/*.(spec|test).js"
    ],
    // Игнорируем вспомогательные файлы
    testPathIgnorePatterns: [
        "/node_modules/",
        "/__tests__/fixtures/",
        "/__tests__/mocks/",
        "/__tests__/setupTests.js"
    ]
};