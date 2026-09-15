import { NotFoundError } from '../../errors/app-error.ts';
import type { BalanceRepository } from './balance.repository.ts';

export class BalanceService {
    readonly #balances: BalanceRepository;

    constructor(balances: BalanceRepository) {
        this.#balances = balances;
    }

    async get(userId: number): Promise<number> {
        const balance = await this.#balances.get(userId);
        if (balance === null) {
            throw new NotFoundError('User not found');
        }
        return balance;
    }
}
