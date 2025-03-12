import { jest } from '@jest/globals';

export const createHttpMock = () => ({ request: jest.fn() });

// Предустановленные ответы для частых случаев
export const httpResponses = {
    success: { status: 200, data: { success: true } },
    unauthorized: { status: 401, data: { error: 'Unauthorized' } },
    badRequest: { status: 400, data: { error: 'Bad Request' } },
    serverError: { status: 500, data: { error: 'Internal Server Error' } }
};

