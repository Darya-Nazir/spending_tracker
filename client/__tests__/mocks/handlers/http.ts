import { jest } from '@jest/globals';

type HttpResponse = {
    status: number;
    data: {
        success?: boolean;
        error?: string;
        [key: string]: any;
};
};

export const createHttpMock = () => ({ request: jest.fn() });

// Предустановленные ответы для частых случаев
export const httpResponses: Record<string, HttpResponse> = {
    success: { status: 200, data: { success: true } },
    unauthorized: { status: 401, data: { error: 'Unauthorized' } },
    badRequest: { status: 400, data: { error: 'Bad Request' } },
    serverError: { status: 500, data: { error: 'Internal Server Error' } }
};