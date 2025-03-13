import { TextEncoder, TextDecoder } from 'util';
import { server } from './mocks/server';

global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Setup MSW server handlers
beforeAll(() => server.listen());
afterEach(() => {
  // Clear localStorage and sessionStorage after each test
  localStorage.clear();
  sessionStorage.clear();
});
afterAll(() => server.close());