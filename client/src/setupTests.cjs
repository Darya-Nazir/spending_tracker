const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

require('whatwg-fetch');
const { server } = require('../mocks/server.cjs');

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());