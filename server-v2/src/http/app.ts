import express, { json, type Express, type Router } from 'express';
import cors from 'cors';
// Express — библиотека поверх встроенного модуля Node node:http. 
// Объект, который возвращает express(), физически является 
// функцией-обработчиком запроса
import type { Config } from '../config/config.ts';
import type { Database } from '../db/database.ts';
import type { Logger } from '../logging/logger.ts';
import { AuthController } from '../modules/auth/auth.controller.ts';
import { AuthRouter } from '../modules/auth/auth.router.ts';
import { AuthService } from '../modules/auth/auth.service.ts';
import { RegistrationService } from '../modules/auth/registration.service.ts';
import { PasswordService } from '../modules/auth/password.service.ts';
import { TokenService } from '../modules/auth/token.service.ts';
import { ErrorHandler } from './middleware/error-handler.ts';
import { NotFoundHandler } from './middleware/not-found.ts';
import { HealthController } from '../modules/health/health.controller.ts';
import { HealthRouter } from '../modules/health/health.router.ts';
import { HealthService } from '../modules/health/health.service.ts';
import { EmailService } from '../modules/users/email.service.ts';
import { UserRepository } from '../modules/users/user.repository.ts';
import { RequestContext } from './middleware/request-context.ts';
import { Authenticate } from './middleware/authenticate.ts';
import { BalanceController } from '../modules/finance/balance/balance.controller.ts';
import { BalanceRepository } from '../modules/finance/balance/balance.repository.ts';
import { BalanceRouter } from '../modules/finance/balance/balance.router.ts';
import { BalanceService } from '../modules/finance/balance/balance.service.ts';

/**
 * Сборка объекта express-приложения: создаёт его, регистрирует middleware
 * и роутеры, возвращает.
 * */

const BODY_LIMIT = '100kb';

export class AppFactory {
    readonly #config: Config;
    readonly #logger: Logger;
    readonly #database: Database;

    constructor(config: Config, logger: Logger, database: Database) {
        this.#config = config;
        this.#logger = logger;
        this.#database = database;
    }

    build(): Express {
        const app = express();

        // По умолчанию express добавляет к каждому ответу заголовок
        // X-Powered-By: Express. Он называет используемый фреймворк и ничего
        // не даёт клиенту, поэтому выключен.
        app.disable('x-powered-by');

        app.use(new RequestContext(this.#logger).attach); // помечает все записи одного запроса requestId
        app.use(cors({
            origin: (origin, callback) => callback(null, origin === this.#config.corsOrigin),
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
        }));
        app.use(json({ limit: BODY_LIMIT }));

        app.use(this.#healthRouter());
        app.use('/api', this.#authRouter());
        app.use('/api', this.#balanceRouter());

        app.use(new NotFoundHandler().reject);
        app.use(new ErrorHandler(this.#logger).respond);

        return app;
    }

    /**
     * Сборка модуля health: сервис отдаётся контроллеру, контроллер — роутеру.
     */
    #healthRouter(): Router {
        return HealthRouter.create(new HealthController(new HealthService(this.#database)));
    }

    #authRouter(): Router {
        const users = new UserRepository(this.#database);
        const passwords = new PasswordService(this.#config);
        const emails = new EmailService();
        const tokens = new TokenService(this.#config);
        const registration = new RegistrationService(this.#database);
        const service = new AuthService(users, passwords, emails, tokens, registration);

        return AuthRouter.create(new AuthController(service));
    }

    #balanceRouter(): Router {
        const service = new BalanceService(new BalanceRepository(this.#database));
        const authenticate = new Authenticate(new TokenService(this.#config));
        return BalanceRouter.create(new BalanceController(service), authenticate);
    }
}
