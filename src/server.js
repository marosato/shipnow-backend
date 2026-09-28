import { createApp } from './app.js';
import { initialize as initializeOrders } from './repositories/order.repository.js';
import { initialize as initializeDeliveries } from './repositories/delivery.repository.js';
import { loadConfig } from './config/env.config.js';
import { connectDatabase, disconnectDatabase } from './config/db.config.js';
import { initialize as initializeUsers } from './repositories/user.repository.js';
import { initialize as initializeProducts } from './repositories/product.repository.js';

async function start() {
  const config = loadConfig();
  try {
    await connectDatabase(config.mongodbUri);
    await Promise.all([initializeUsers(), initializeProducts(), initializeOrders(), initializeDeliveries()]);
  } catch {
    throw new Error('No se pudo preparar MongoDB. Verifique conexión, permisos e índices.');
  }
  const app = createApp(config);
  const server = app.listen(config.port, '127.0.0.1', () => {
    console.info(`ShipNow M2 disponible en http://127.0.0.1:${config.port}`);
  });
  server.on('error', async () => {
    console.error('No se pudo abrir el puerto HTTP configurado.');
    await disconnectDatabase();
    process.exitCode = 1;
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      try { await disconnectDatabase(); }
      finally { clearTimeout(timeout); }
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(async (error) => {
  console.error(error.message);
  await disconnectDatabase();
  process.exitCode = 1;
});
