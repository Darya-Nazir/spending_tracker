import { z } from 'zod';

export const categoryWriteSchema = z.object({
    title: z.string().refine((title) => title.trim().length > 0, 'title is required'),
}).strict();

export type CategoryWriteInput = z.infer<typeof categoryWriteSchema>;

export const categoryParamsSchema = z.object({
    // ID хранится в PostgreSQL integer: положительное целое до 2^31 − 1.
    id: z.string().regex(/^[1-9]\d*$/)
        .refine((id) => Number(id) <= 2147483647, 'Category ID exceeds the integer range'),
});
