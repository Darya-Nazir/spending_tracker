import { TextEncoder, TextDecoder } from 'util';
import { beforeAll, afterAll, afterEach } from '@jest/globals';

import 'whatwg-fetch';

import { server } from './mocks/server';
import 'whatwg-fetch';

// Расширяем глобальный тип
declare global {
    // Используем конкретный тип из Node.js вместо ссылки на typeof
    var TextDecoder: {
        new(label?: string, options?: TextDecoderOptions): TextDecoder;
        prototype: TextDecoder;
    };
}

// Устанавливаем глобальные TextEncoder и TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any; // Принудительное приведение типов

// Настройка серверных обработчиков MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());