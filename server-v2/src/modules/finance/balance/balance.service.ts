import { NotFoundError } from '../../../errors/app-error.ts';
import type { BalanceRepository } from './balance.repository.ts';

export type Balance = { balance: number };

export class BalanceService {
    readonly #balances: BalanceRepository;

    constructor(balances: BalanceRepository) {
        this.#balances = balances;
    }

    async getBalance(userId: number): Promise<Balance> {
        const balance = await this.#balances.findByUserId(userId);
        if (balance === null) {
            throw new NotFoundError('Financial account not found');
        }
        return { balance };
    }
}
