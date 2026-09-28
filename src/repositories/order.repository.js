import Order from '../models/order.model.js';

export async function initialize() { await Order.init(); }

export function insertMany(documents) {
  return Order.insertMany(documents, { ordered: true });
}

export function deleteMockBatch(batchId) {
  // Solo datos identificados con el UUID de este lote; nunca borra una colección.
  return Order.deleteMany({ mockBatchId: batchId }).exec();
}
