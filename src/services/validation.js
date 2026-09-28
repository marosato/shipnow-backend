import { AppError } from '../errors/app-error.js';

export function validateBody(body, allowedFields) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Se requiere un objeto JSON.');
  }
  if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
    throw new AppError(400, 'El body contiene campos no permitidos.');
  }
}

export function requiredText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AppError(400, `${label} es obligatorio y admite hasta ${maxLength} caracteres.`);
  }
  return value.trim();
}

export function validateId(id) {
  if (typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new AppError(400, 'El identificador debe contener 24 caracteres hexadecimales.');
  }
}

export function pagination(query = {}) {
  if (Object.keys(query).some((key) => !['limit', 'page'].includes(key))) {
    throw new AppError(400, 'Parámetro de consulta no permitido.');
  }
  const parse = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new AppError(400, 'page y limit deben ser enteros positivos.');
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > max) {
      throw new AppError(400, 'page o limit fuera del rango permitido.');
    }
    return number;
  };
  const limit = parse(query.limit, 20, 100);
  const page = parse(query.page, 1, 1000000);
  return { limit, skip: (page - 1) * limit };
}
