import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'web-streams-polyfill';
import 'whatwg-fetch';

import { server } from './mocks/server.js';

// Устанавливаем глобальные TextEncoder и TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Добавляем полифилл для TransformStream
class MockTransformStream {
    constructor() {
        this.readable = new ReadableStream();
        this.writable = {
            getWriter: () => ({
                write: () => Promise.resolve(),
                close: () => Promise.resolve(),
                abort: () => Promise.resolve()
            })
        };
    }
}

global.TransformStream = MockTransformStream;
global.ReadableStream = ReadableStream;

// Настройка серверных обработчиков MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());