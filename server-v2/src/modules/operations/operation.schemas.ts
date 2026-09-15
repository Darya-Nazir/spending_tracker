import { z } from 'zod';

export const operationListSchema = z.object({
    // Этап 19 расширит список периодов и добавит фильтрацию по датам.
    period: z.literal('all', { error: 'Only period=all is currently supported' }).optional(),
});
