import { z } from 'zod';

const intervalDate = z.iso.date().refine((date) => date >= '0001-01-01', 'Date must have a positive year');

export const operationListSchema = z.discriminatedUnion('period', [
    z.object({ period: z.enum(['all', 'today', 'week', 'month', 'year']).optional() }),
    z.object({
        period: z.literal('interval'),
        dateFrom: intervalDate,
        dateTo: intervalDate,
    }),
]).refine((input) => input.period !== 'interval' || input.dateFrom <= input.dateTo, {
    message: 'dateFrom must be on or before dateTo',
    path: ['dateFrom'],
});

export type OperationListInput = z.infer<typeof operationListSchema>;

export const operationCreateSchema = z.object({
    type: z.enum(['expense', 'income']),
    // ID хранится в PostgreSQL integer: положительное целое до 2^31 − 1.
    category_id: z.number().int().positive().max(2147483647),
    // numeric(14,2) в БД проверяет amount > 0.
    amount: z.number().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
    // Пустая строка допустима: старый сервер отвергал её, это баг, а не правило.
    comment: z.string().default(''),
}).strict();

export type OperationCreateInput = z.infer<typeof operationCreateSchema>;
