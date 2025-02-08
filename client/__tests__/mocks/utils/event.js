import { jest } from '@jest/globals';

export const createMockEvent = () => ({
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: {
        value: '',
        files: []
    }
});

