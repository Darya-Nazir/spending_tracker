import { z } from 'zod';

export const balanceWriteSchema = z.object({
    balance: z.number().finite(),
}).strict();

export type BalanceWriteInput = z.infer<typeof balanceWriteSchema>;
