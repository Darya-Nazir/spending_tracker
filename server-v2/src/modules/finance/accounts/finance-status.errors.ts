import { ServiceUnavailableError } from '../../../errors/app-error.ts';

/** Аккаунт ещё готовится: данных финансов пока нет. */
export const FINANCE_NOT_READY = 'FINANCE_NOT_READY';

/** Хранилище finance не отвечает: статус аккаунта прочитать нечем. */
export const FINANCE_UNAVAILABLE = 'FINANCE_UNAVAILABLE';

export const financeNotReady = (): ServiceUnavailableError => new ServiceUnavailableError(
    'Financial account is not ready yet', FINANCE_NOT_READY,
);

export const financeUnavailable = (): ServiceUnavailableError => new ServiceUnavailableError(
    'Financial storage is temporarily unavailable', FINANCE_UNAVAILABLE,
);
