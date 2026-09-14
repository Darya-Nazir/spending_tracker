/**
 * Публичный контракт identity: что модуль отдаёт наружу.
 * Внутренние репозитории и SQL остаются владельцу.
 */
export type { AuthIdentity, TokenPair } from './auth/token.service.ts';
export { TokenService } from './auth/token.service.ts';
export type { PublicUser } from './auth/auth.service.ts';
export { enqueueUserRegistered } from './outbox/enqueue-user-registered.ts';
export type { EventDelivery, UserRegisteredEvent } from './outbox/user-registered.ts';
export { MAX_DELIVERY_ATTEMPTS, OutboxWorker } from './outbox/outbox.worker.ts';
