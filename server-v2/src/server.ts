import { Config } from './config/config.ts';
import { Database } from './db/database.ts';
import { AppFactory } from './http/app.ts';
import { Logger } from './logging/logger.ts';

/**
 * Единственный файл, который вызывает listen() и process.exit().
 */

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

    process.exit(1);
});
