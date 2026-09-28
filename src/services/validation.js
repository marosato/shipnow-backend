import { ERRORS } from '../errors/error-catalog.js';
import { AppError } from '../errors/app-error.js';

export function validateBody(body, allowedFields) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(ERRORS.INVALID_BODY);
  }
  if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
    throw new AppError(ERRORS.INVALID_BODY);
  }
}

export function requiredText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AppError(ERRORS.INVALID_TEXT);
  }
  return value.trim();
}

export function validateId(id) {
  if (typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new AppError(ERRORS.INVALID_ID);
  }
}

export function pagination(query = {}) {
  if (Object.keys(query).some((key) => !['limit', 'page'].includes(key))) {
    throw new AppError(ERRORS.INVALID_QUERY);
  }
  const parse = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new AppError(ERRORS.INVALID_PAGINATION);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > max) {
      throw new AppError(ERRORS.INVALID_PAGINATION);
    }
    return number;
  };
  const limit = parse(query.limit, 20, 100);
  const page = parse(query.page, 1, 1000000);
  return { limit, skip: (page - 1) * limit };
}
