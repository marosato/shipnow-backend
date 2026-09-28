import { loadConfig } from '../src/config/env.config.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.config.js';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

// Una conexión para toda la ejecución serial de integración.
// Esperar todos los modelos evita cerrar con inicializaciones pendientes.
export const mochaHooks = {
  async beforeAll() {
    const config = loadConfig();
    const database = new URL(config.mongodbUri).pathname.slice(1);
    if (config.nodeEnv !== 'test' || !database.endsWith('_test')) {
      throw new Error('Se requiere NODE_ENV=test y una base terminada en _test.');
    }
    await connectDatabase(config.mongodbUri);
    const results = await Promise.allSettled([
      User.init(), Product.init(), Order.init(), Delivery.init(),
    ]);
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
  },
  async afterAll() {
    await disconnectDatabase();
  },
};
