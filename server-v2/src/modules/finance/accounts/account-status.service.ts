import type { Database } from '../../../db/database.ts';
import { isConnectionFailure } from '../../../db/connection-failure.ts';
import { AccountRepository, type AccountStatus } from './account.repository.ts';
import { financeUnavailable } from './finance-status.errors.ts';

export type FinanceStatus = { status: AccountStatus };

/**
 * Читает состояние подготовки финансов. Отсутствующая строка аккаунта означает
 * pending: событие UserRegistered ещё не доставлено. Причина отказа наружу
 * не выходит, она остаётся в finance.accounts.status_reason.
 */
export class AccountStatusService {
    readonly #accounts: AccountRepository;

    constructor(finance: Database) {
        this.#accounts = new AccountRepository(finance);
    }

    async getStatus(userId: number): Promise<FinanceStatus> {
        try {
            return { status: await this.#accounts.findStatusByUserId(userId) ?? 'pending' };
        } catch (error) {
            if (isConnectionFailure(error)) {
                throw financeUnavailable();
            }

            throw error;
        }
    }
}
