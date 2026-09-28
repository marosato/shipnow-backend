import User from '../models/user.model.js';

const fields = '_id name email role createdAt updatedAt';

export function findAll({ limit, skip }) {
  return User.find({}).select(fields).sort({ _id: 1 }).skip(skip).limit(limit).lean().exec();
}

export function findById(id) {
  return User.findById(id).select(fields).lean().exec();
}

export async function create(data) {
  const document = await User.create(data);
  return findById(document._id);
}

// Asegura que los índices declarados estén listos antes de aceptar peticiones.
export async function initialize() {
  await User.init();
}

export function insertMany(documents) {
  return User.insertMany(documents, { ordered: true });
}

export function deleteMockBatch(batchId) {
  // Solo datos identificados con el UUID de este lote; nunca borra una colección.
  return User.deleteMany({ mockBatchId: batchId }).exec();
}
