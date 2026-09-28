import * as userRepository from '../repositories/user.repository.js';
import * as orderRepository from '../repositories/order.repository.js';
import * as deliveryRepository from '../repositories/delivery.repository.js';
import { generateDataset } from './mock.generator.js';
import { MOCK_LIMITS } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { validateBody } from './validation.js';

export function parseQueryQty(query = {}) {
  if (Object.keys(query).some(key => key !== 'qty')) {
    throw new AppError(400, 'Solo se admite el parámetro qty.');
  }
  if (query.qty === undefined) return MOCK_LIMITS.DEFAULT_QTY;
  if (typeof query.qty !== 'string' || !/^[1-9]\d*$/.test(query.qty)) {
    throw new AppError(400, 'qty debe ser un entero positivo.');
  }
  return validateQty(Number(query.qty));
}

function validateQty(qty) {
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > MOCK_LIMITS.MAX_QTY) {
    throw new AppError(400, `qty debe ser un entero entre 1 y ${MOCK_LIMITS.MAX_QTY}.`);
  }
  return qty;
}

// Inyección simple para probar fallas de escritura sin una infraestructura adicional.
export function createMockService(repositories = {
  users: userRepository, orders: orderRepository, deliveries: deliveryRepository,
}) {
  return {
    preview(query) { return generateDataset(parseQueryQty(query)); },
    async seed(body, query = {}) {
      if (Object.keys(query).length) throw new AppError(400, 'En seed, qty se envía en el body JSON.');
      validateBody(body, ['qty']);
      const dataset = generateDataset(validateQty(body.qty));
      const { batchId, users, drivers, orders, deliveries } = dataset;
      try {
        await repositories.users.insertMany([...users, ...drivers]);
        await repositories.orders.insertMany(orders);
        await repositories.deliveries.insertMany(deliveries);
      } catch {
        // Compensación en orden inverso. Si falla, no eliminamos sus padres.
        // No es una transacción: una caída de proceso requiere revisión del lote.
        try {
          await repositories.deliveries.deleteMockBatch(batchId);
          await repositories.orders.deleteMockBatch(batchId);
          await repositories.users.deleteMockBatch(batchId);
        } catch {
          throw new AppError(500, `No se completó la carga ni la limpieza del lote ${batchId}. Requiere revisión.`);
        }
        throw new AppError(500, `Falló la carga del lote ${batchId}; sus registros fueron retirados.`);
      }
      return { batchId, inserted: { users: users.length, drivers: drivers.length,
        orders: orders.length, deliveries: deliveries.length, total: users.length + drivers.length + orders.length + deliveries.length },
        ids: { users: users.map(x => x._id), drivers: drivers.map(x => x._id),
          orders: orders.map(x => x._id), deliveries: deliveries.map(x => x._id) } };
    },
  };
}

export const mockService = createMockService();
