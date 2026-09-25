import { NotFoundError } from '../../errors/app-error.ts';
import type { BalanceRepository } from './balance.repository.ts';

export class BalanceService {
    private readonly balances: BalanceRepository;

    constructor(balances: BalanceRepository) {
        this.balances = balances;
    }

    async get(userId: number): Promise<number> {
        const balance = await this.balances.get(userId);
        if (balance === null) {
            throw new NotFoundError('User not found');
        }
        return balance;
    }

    async set(userId: number, balance: number): Promise<number> {
        const updated = await this.balances.update(userId, balance);
        if (updated === null) {
            throw new NotFoundError('User not found');
        }
        return updated;
    }
}
