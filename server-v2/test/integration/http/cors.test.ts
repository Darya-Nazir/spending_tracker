import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';

import { useTestApp } from '../../helpers/app.ts';

const { app } = useTestApp();

test('allows the client origin, methods and headers in an unauthenticated preflight', async () => {
    // разрешает источник, методы и заголовки клиента в предварительном запросе без токена
    const response = await request(app).options('/api/login')
        .set('Origin', 'http://localhost:9000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'authorization,content-type,accept');
    assert.equal(response.status, 204);
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:9000');
    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
        assert.ok(response.headers['access-control-allow-methods']?.split(',').includes(method));
    }
    for (const header of ['authorization', 'content-type', 'accept']) {
        assert.ok(response.headers['access-control-allow-headers']?.toLowerCase().split(',').includes(header));
    }
    assert.equal(response.headers['access-control-allow-credentials'], undefined);
});

test('exposes JSON errors to the client origin and omits CORS access for other origins', async () => {
    // открывает JSON ошибок источнику клиента и ограничивает CORS для прочих источников
    const response = await request(app).post('/api/login').set('Origin', 'http://localhost:9000').send({});
    assert.equal(response.status, 400);
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:9000');
    const foreign = await request(app).options('/api/login').set('Origin', 'http://other.example');
    assert.equal(foreign.headers['access-control-allow-origin'], undefined);
});
