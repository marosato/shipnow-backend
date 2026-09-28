import Delivery from '../models/delivery.model.js';

export async function initialize() { await Delivery.init(); }

export function insertMany(documents) {
  return Delivery.insertMany(documents, { ordered: true });
}

export function deleteMockBatch(batchId) {
  // Solo datos identificados con el UUID de este lote; nunca borra una colección.
  return Delivery.deleteMany({ mockBatchId: batchId }).exec();
}
