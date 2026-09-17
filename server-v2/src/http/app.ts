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
import { PasswordService } from '../modules/auth/password.service.ts';
import { TokenService } from '../modules/auth/token.service.ts';
import { BalanceController } from '../modules/balance/balance.controller.ts';
import { BalanceRepository } from '../modules/balance/balance.repository.ts';
import { BalanceRouter } from '../modules/balance/balance.router.ts';
import { BalanceService } from '../modules/balance/balance.service.ts';
import { CategoryRepository } from '../modules/categories/category.repository.ts';
import { CategoryRouter } from '../modules/categories/category.router.ts';
import { CategoryService } from '../modules/categories/category.service.ts';
import { Authenticate } from './middleware/authenticate.ts';
import { ErrorHandler } from './middleware/error-handler.ts';
import { NotFoundHandler } from './middleware/not-found.ts';
import { HealthController } from '../modules/health/health.controller.ts';
import { HealthRouter } from '../modules/health/health.router.ts';
import { HealthService } from '../modules/health/health.service.ts';
import { OperationController } from '../modules/operations/operation.controller.ts';
import { OperationRepository } from '../modules/operations/operation.repository.ts';
import { OperationRouter } from '../modules/operations/operation.router.ts';
import { OperationService } from '../modules/operations/operation.service.ts';
import { EmailService } from '../modules/users/email.service.ts';
import { UserRepository } from '../modules/users/user.repository.ts';
import { RequestContext } from './middleware/request-context.ts';

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
        app.use('/api/categories', this.#categoryRouter());
        app.use('/api/balance', this.#balanceRouter());
        app.use('/api/operations', this.#operationRouter());

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
        const service = new AuthService(users, passwords, emails, tokens, this.#database);

        return AuthRouter.create(new AuthController(service));
    }

    #categoryRouter(): Router {
        const service = new CategoryService(new CategoryRepository(this.#database));
        const authenticate = new Authenticate(new TokenService(this.#config));
        return CategoryRouter.create(service, authenticate);
    }

    #balanceRouter(): Router {
        const service = new BalanceService(new BalanceRepository(this.#database));
        const authenticate = new Authenticate(new TokenService(this.#config));
        return BalanceRouter.create(new BalanceController(service), authenticate);
    }

    #operationRouter(): Router {
        const service = new OperationService(
            new OperationRepository(this.#database), new CategoryRepository(this.#database),
            this.#config.appTz,
        );
        const authenticate = new Authenticate(new TokenService(this.#config));
        return OperationRouter.create(new OperationController(service), authenticate);
    }
}
