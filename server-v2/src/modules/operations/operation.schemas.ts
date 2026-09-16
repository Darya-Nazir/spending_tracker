import { z } from 'zod';

export const operationListSchema = z.object({
    // Этап 19 расширит список периодов и добавит фильтрацию по датам.
    period: z.literal('all', { error: 'Only period=all is currently supported' }).optional(),
});

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
