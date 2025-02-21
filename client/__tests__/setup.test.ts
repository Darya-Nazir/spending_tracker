import { TextEncoder, TextDecoder } from 'util';

import 'whatwg-fetch';

import { server } from './mocks/server.js';

// Устанавливаем глобальные TextEncoder и TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Настройка серверных обработчиков MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());