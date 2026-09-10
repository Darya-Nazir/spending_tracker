/**
 * Публичный контракт identity: что модуль отдаёт наружу.
 * Внутренние репозитории и SQL остаются владельцу.
 */
export type { AuthIdentity, TokenPair } from './auth/token.service.ts';
export { TokenService } from './auth/token.service.ts';
export type { PublicUser } from './auth/auth.service.ts';
