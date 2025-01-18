module.exports = {
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.cjs'],  // изменили .js на .cjs
    transform: { '^.+\\.js$': 'babel-jest' },
    moduleFileExtensions: ['js', 'json'],
    testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] }
};
