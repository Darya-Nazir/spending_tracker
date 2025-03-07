"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockEvent = void 0;
const globals_1 = require("@jest/globals");
const createMockEvent = () => ({
    preventDefault: globals_1.jest.fn(),
    stopPropagation: globals_1.jest.fn(),
    target: {
        value: '',
        files: []
    }
});
exports.createMockEvent = createMockEvent;
