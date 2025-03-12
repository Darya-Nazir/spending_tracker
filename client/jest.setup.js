import { TextEncoder, TextDecoder } from 'text-encoding-utf-8';
import { ReadableStream } from 'web-streams-polyfill';
import { fetch as whatwgFetch } from 'whatwg-fetch';

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

// Добавляем необходимые полифиллы для web-streams
global.ReadableStream = ReadableStream;

// Настраиваем полифилл для fetch
if (!global.fetch) {
    global.fetch = whatwgFetch;
}

// Полифилл для Request
global.Request = class Request {
    constructor(input, init = {}) {
        this.url = input;
        this.method = init.method || 'GET';
        this.headers = init.headers || {};
        this.body = init.body || null;
    }
};

// Полифилл для Headers
global.Headers = class Headers {
    constructor(init = {}) {
        this._headers = {};
        if (init) {
            Object.keys(init).forEach(key => {
                this._headers[key.toLowerCase()] = init[key];
            });
        }
    }

    get(name) {
        return this._headers[name.toLowerCase()] || null;
    }

    set(name, value) {
        this._headers[name.toLowerCase()] = value;
    }

    has(name) {
        return this._headers[name.toLowerCase()] !== undefined;
    }
};

// Мок для Response
global.Response = class Response {
    constructor(body, init = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.statusText = init.statusText || '';
        this.headers = new Headers(init.headers);
        this._bodyInit = body;
    }

    json() {
        return Promise.resolve(JSON.parse(this._bodyInit));
    }

    text() {
        return Promise.resolve(this._bodyInit);
    }
};