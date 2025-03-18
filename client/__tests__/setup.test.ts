import { TextEncoder, TextDecoder } from 'util';
import { server } from './mocks/server';
import { beforeAll, afterAll, afterEach } from '@jest/globals';
// Устанавливаем глобальные TextEncoder и TextDecoder
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

//  Setup MSW server handlers
beforeAll(() => server.listen());
afterEach(() => {
    // Clear localStorage and sessionStorage after each test
    localStorage.clear();
    sessionStorage.clear();
});
afterAll(() => server.close());