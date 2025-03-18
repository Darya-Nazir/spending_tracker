import { jest } from '@jest/globals';

type MockEvent = {
    preventDefault: jest.Mock;
    stopPropagation: jest.Mock;
    target: {
        value: string;
        files: any[];
    };
};

export const createMockEvent = (): MockEvent => ({
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: {
        value: '',
        files: []
    }
});
