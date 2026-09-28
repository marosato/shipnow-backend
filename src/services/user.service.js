import * as repository from '../repositories/user.repository.js';
import { USER_ROLES } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { pagination, requiredText, validateBody, validateId } from './validation.js';

export function list(query) {
  return repository.findAll(pagination(query));
}

export async function getById(id) {
  validateId(id);
  const user = await repository.findById(id);
  if (!user) throw new AppError(404, 'Usuario no encontrado.');
  return user;
}

export function create(body) {
  validateBody(body, ['name', 'email']);
  const name = requiredText(body.name, 'name', 120);
  const email = requiredText(body.email, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, 'email tiene un formato inválido.');
  }
  // No se acepta un rol elevado desde el body de una ruta sin autenticación.
  return repository.create({ name, email, role: USER_ROLES.USER });
}
