import type { OperationListInput } from './operation.schemas.ts';

export type DateRange = { dateFrom: string; dateTo: string };

export class Period {
    static range(input: OperationListInput, timeZone: string, now = new Date()): DateRange | null {
        if (input.period === undefined || input.period === 'all') return null;
        if (input.period === 'interval') return { dateFrom: input.dateFrom, dateTo: input.dateTo };

        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(now);
        const { year, month, day } = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
        const dateTo = `${year}-${month}-${day}`;
        // Арифметика календарных дат в UTC сохраняет дату при переходах летнего времени.
        const from = new Date(`${dateTo}T00:00:00Z`);

        if (input.period === 'week') {
            from.setUTCDate(from.getUTCDate() - 7);
        } else if (input.period === 'month' || input.period === 'year') {
            const dayOfMonth = from.getUTCDate();
            from.setUTCDate(1);
            from.setUTCMonth(from.getUTCMonth() - (input.period === 'month' ? 1 : 12));
            const lastDay = new Date(from);
            lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
            from.setUTCDate(Math.min(dayOfMonth, lastDay.getUTCDate()));
        }

        return { dateFrom: from.toISOString().slice(0, 10), dateTo };
    }
}
