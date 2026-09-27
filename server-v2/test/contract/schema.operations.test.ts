import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { useTestDatabase } from '../helpers/db.ts';
import { createUser } from '../helpers/factories.ts';

const { database } = useTestDatabase();

type ReferencedOperation = {
    categoryId: number;
    operationId: number;
};

const createReferencedOperation = async (): Promise<ReferencedOperation> => {
    const user = await createUser(database);
    const { rows: categoryRows } = await database.query<{ id: number }>(
        `INSERT INTO categories (user_id, type, title, title_normalized)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, 'expense', 'Еда', 'еда'],
    );
    const category = categoryRows[0];
    assert.ok(category);

    const { rows: operationRows } = await database.query<{ id: number }>(
        `INSERT INTO operations (user_id, category_id, type, amount, date, comment)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.id, category.id, 'expense', 100, '2026-09-01', 'Обед'],
    );
    const operation = operationRows[0];
    assert.ok(operation);

    return { categoryId: category.id, operationId: operation.id };
};

describe('operations schema', () => {
    for (const mismatch of ['owner', 'type'] as const) {
        test(`rejects an operation whose ${mismatch} differs from its category`, async () => {
            // отклоняет операцию, у которой владелец или тип отличается от категории
            const fixture = await createReferencedOperation();
            const otherUser = await createUser(database);

            await assert.rejects(
                database.query(
                    `INSERT INTO operations (user_id, category_id, type, amount, date)
                     SELECT coalesce($2::integer, user_id), category_id, $3, amount, date
                       FROM operations WHERE id = $1`,
                    [
                        fixture.operationId,
                        mismatch === 'owner' ? otherUser.id : null,
                        mismatch === 'type' ? 'income' : 'expense',
                    ],
                ),
                { code: '23503' },
            );
        });
    }

    test('rejects deleting a category while an operation references it', async () => {
        // Foreign Key запрещает удалять категорию, пока на неё ссылается операция
        const fixture = await createReferencedOperation();

        await assert.rejects(
            database.query('DELETE FROM categories WHERE id = $1', [fixture.categoryId]),
            (error: unknown) => {
                assert.equal((error as { code?: string }).code, '23503');
                return true;
            },
        );
    });

    test('allows deleting a category after its operation is deleted', async () => {
        // после удаления операции категория становится пустой и удаляется
        const fixture = await createReferencedOperation();

        await database.query(
            'DELETE FROM operations WHERE id = $1',
            [fixture.operationId],
        );
        const deletion = await database.query(
            'DELETE FROM categories WHERE id = $1',
            [fixture.categoryId],
        );

        assert.equal(deletion.rowCount, 1);
    });
});
