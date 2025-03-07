"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
require("whatwg-fetch");
const server_js_1 = require("./mocks/server.js");
// Устанавливаем глобальные TextEncoder и TextDecoder
global.TextEncoder = util_1.TextEncoder;
global.TextDecoder = util_1.TextDecoder;
// Настройка серверных обработчиков MSW
beforeAll(() => server_js_1.server.listen());
afterEach(() => server_js_1.server.resetHandlers());
afterAll(() => server_js_1.server.close());
