import type { InsertedOperation, Operation } from './operation.repository.ts';

/** Собирает строку операции из БД и название категории в DTO ответа API. */
export class OperationMapper {
    static toResponse(operation: InsertedOperation, categoryTitle: string): Operation {
        return { ...operation, category: categoryTitle };
    }
}
