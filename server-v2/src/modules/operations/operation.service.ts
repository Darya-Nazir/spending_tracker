import type { Operation, OperationRepository } from './operation.repository.ts';

export class OperationService {
    readonly #operations: OperationRepository;

    constructor(operations: OperationRepository) {
        this.#operations = operations;
    }

    list(userId: number): Promise<Operation[]> {
        return this.#operations.list(userId);
    }
}
