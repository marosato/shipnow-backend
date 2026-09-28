import * as repository from '../repositories/product.repository.js';
import { PRODUCT_STATUS } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { pagination, requiredText, validateBody, validateId } from './validation.js';

export function list(query) {
  return repository.findAll(pagination(query));
}

export async function getById(id) {
  validateId(id);
  const product = await repository.findById(id);
  if (!product) throw new AppError(404, 'Producto no encontrado.');
  return product;
}

export function create(body) {
  validateBody(body, ['name', 'price', 'stock']);
  const name = requiredText(body.name, 'name', 120);
  if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
    throw new AppError(400, 'price debe ser un número finito no negativo.');
  }
  if (!Number.isSafeInteger(body.stock) || body.stock < 0) {
    throw new AppError(400, 'stock debe ser un entero no negativo.');
  }
  // Decisión de negocio: el cliente no puede imponer un estado incompatible con el stock.
  const status = body.stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;
  return repository.create({ name, price: body.price, stock: body.stock, status });
}
