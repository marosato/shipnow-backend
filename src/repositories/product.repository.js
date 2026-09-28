import Product from '../models/product.model.js';

const fields = '_id name price stock status createdAt updatedAt';

export function findAll({ limit, skip }) {
  return Product.find({}).select(fields).sort({ _id: 1 }).skip(skip).limit(limit).lean().exec();
}

export function findById(id) {
  return Product.findById(id).select(fields).lean().exec();
}

export async function create(data) {
  const document = await Product.create(data);
  return findById(document._id);
}

// Asegura que los índices declarados estén listos antes de aceptar peticiones.
export async function initialize() {
  await Product.init();
}
