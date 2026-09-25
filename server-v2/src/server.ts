import { Config } from './config/config.ts';
import { Database } from './db/database.ts';
import { AppFactory } from './http/app.ts';
import { Logger } from './logging/logger.ts';

// Точка входа

const SHUTDOWN_TIMEOUT_MS = 10_000;

const loadConfig = (): Config => {
    try {
        return Config.load();
    } catch (error) {
        process.stderr.write(`${(error as Error).message}\n`);
        process.exit(1);
    }
};

const config = loadConfig();
const logger = Logger.create(config);

const database = new Database(config, logger);

const app = new AppFactory(config, logger, database).build();

const server = app.listen(config.port);

server.on('listening', () => {
    logger.info({ port: config.port, nodeEnv: config.nodeEnv }, 'server listening');
});

// Порт занят другим процессом — частый случай, пока рядом работает старый server/.
server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
        logger.error({ port: config.port }, 'port is already in use');
    } else {
        logger.error({ err: { name: error.name, message: error.message } }, 'server failed to start');
    }

    process.exitCode = 1;
});

let shuttingDown = false;

// SIGTERM шлёт docker stop/docker compose down и Kubernetes, SIGINT — Ctrl+C в терминале.
const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;

    logger.info({ signal }, 'shutdown started');

    const forceExit = setTimeout(() => {
        logger.error({ signal, timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'shutdown timed out, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    // Новые соединения не принимаются, коллбэк срабатывает после завершения текущих запросов.
    server.close((closeError) => {
        if (closeError) {
            logger.error({ err: { name: closeError.name, message: closeError.message } }, 'server close failed');
            process.exitCode = 1;
        }

        database.close()
            .catch((dbError) => {
                const err = dbError as Error;
                logger.error({ err: { name: err.name, message: err.message } }, 'database close failed');
                process.exitCode = 1;
            })
            .finally(() => {
                clearTimeout(forceExit);
                logger.info({ signal }, 'shutdown finished');
            });
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
