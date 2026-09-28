import { logger, configureLogger, closeLogger } from './config/logger.config.js';
import { createApp } from './app.js';
import { initialize as initializeOrders } from './repositories/order.repository.js';
import { initialize as initializeDeliveries } from './repositories/delivery.repository.js';
import { loadConfig } from './config/env.config.js';
import { connectDatabase, disconnectDatabase } from './config/db.config.js';
import { initialize as initializeUsers } from './repositories/user.repository.js';
import { initialize as initializeProducts } from './repositories/product.repository.js';

let startupStage = 'logger';

async function start() {
  // Permite registrar incluso fallos de validación, sin imprimir valores del entorno.
  configureLogger({ nodeEnv: 'production' });
  startupStage = 'configuration';
  const config = loadConfig();
  configureLogger(config);
  startupStage = 'database';
  try {
    await connectDatabase(config.mongodbUri);
    const results = await Promise.allSettled([initializeUsers(), initializeProducts(), initializeOrders(), initializeDeliveries()]);
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
  } catch {
    throw new Error('No se pudo preparar MongoDB. Verifique conexión, permisos e índices.');
  }
  const app = createApp(config);
  const server = app.listen(config.port, '127.0.0.1', () => {
    logger.info('SERVER_STARTED', { port: config.port, address: `ShipNow M4 disponible en http://127.0.0.1:${config.port}` });
  });
  server.on('error', async () => {
    logger.fatal('HTTP_LISTEN_FAILED', { port: config.port });
    await disconnectDatabase();
    await closeLogger();
    process.exitCode = 1;
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      try { await disconnectDatabase(); }
      finally { logger.info('SERVER_STOPPED'); await closeLogger(); clearTimeout(timeout); }
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(async (error) => {
  logger.fatal('STARTUP_FAILED', { stage: startupStage,
    ...(startupStage === 'configuration' && error.message.startsWith('Configuración inválida:')
      ? { reason: error.message } : {}) });
  await disconnectDatabase();
  await closeLogger();
  process.exitCode = 1;
});
