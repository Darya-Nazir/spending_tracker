"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpResponses = exports.createHttpMock = void 0;
const globals_1 = require("@jest/globals");
const createHttpMock = () => ({ request: globals_1.jest.fn() });
exports.createHttpMock = createHttpMock;
// Предустановленные ответы для частых случаев
exports.httpResponses = {
    success: { status: 200, data: { success: true } },
    unauthorized: { status: 401, data: { error: 'Unauthorized' } },
    badRequest: { status: 400, data: { error: 'Bad Request' } },
    serverError: { status: 500, data: { error: 'Internal Server Error' } }
};
