import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Period } from '../../src/modules/operations/period.ts';

test('handles leap days, year boundaries and daylight saving changes in rolling periods', () => {
    // учитывает високосные дни, границы года и переходы летнего времени в скользящих периодах
    for (const [period, now, timeZone, dateFrom, dateTo] of [
        ['year', '2024-02-29T12:00:00Z', 'UTC', '2023-02-28', '2024-02-29'],
        ['month', '2025-01-31T12:00:00Z', 'UTC', '2024-12-31', '2025-01-31'],
        ['week', '2025-01-02T12:00:00Z', 'UTC', '2024-12-26', '2025-01-02'],
        ['week', '2024-03-11T04:30:00Z', 'America/New_York', '2024-03-04', '2024-03-11'],
    ] as const) {
        assert.deepEqual(Period.range({ period }, timeZone, new Date(now)), { dateFrom, dateTo });
    }
});
