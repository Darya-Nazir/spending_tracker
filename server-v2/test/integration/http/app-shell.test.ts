import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { useTestApp } from '../../helpers/app.ts';

const { app } = useTestApp();

describe('app shell', () => {

    test('GET /health answers 200 {status:"ok"} as JSON', async () => {
        // GET /health отвечает 200 {status:"ok"} в JSON
        const response = await request(app).get('/health');

        assert.equal(response.status, 200);
        assert.equal(response.type, 'application/json');
        assert.deepEqual(response.body, { status: 'ok' });
    });
});
