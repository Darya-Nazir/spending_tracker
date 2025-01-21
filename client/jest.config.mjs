export default {
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    moduleFileExtensions: ['js', 'json'],
    testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
    transformIgnorePatterns: [
        'node_modules/(?!(yargs|yargs-parser)/)'
    ]
};