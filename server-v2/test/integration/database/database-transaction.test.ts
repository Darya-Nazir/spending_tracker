import assert from 'node:assert/strict';
import { test } from 'node:test';

import { useTestDatabase } from '../../helpers/db.ts';

const { database } = useTestDatabase();

test('reuses the connection after commit and rollback', async () => {
    // повторно использует соединение после фиксации и отката
    for (const fail of [false, true]) {
        let pid: number | undefined;
        const failure = new Error('Transaction callback failed');
        const transaction = database.transaction(async (executor) => {
            const { rows } = await executor.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
            pid = rows[0]?.pid;
            if (fail) throw failure;
            return 'committed';
        });

        if (fail) await assert.rejects(transaction, (error) => error === failure);
        else assert.equal(await transaction, 'committed');

        assert.ok(pid);
        const { rows } = await database.query('SELECT pg_backend_pid() AS pid');
        assert.equal(rows[0]?.pid, pid);
    }
});
