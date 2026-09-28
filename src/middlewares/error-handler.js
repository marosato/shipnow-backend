import { logger } from '../config/logger.config.js';
import { AppError } from '../errors/app-error.js';
import { ERRORS } from '../errors/error-catalog.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let definition = ERRORS.INTERNAL_ERROR;
  if (error instanceof AppError) {
    definition = ERRORS[error.code] ?? ERRORS.INTERNAL_ERROR;
  } else if (error?.code === 11000) {
    definition = ERRORS.DUPLICATE_RESOURCE;
  } else if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    definition = ERRORS.INVALID_DATA;
  } else if (error?.type === 'entity.parse.failed') {
    definition = ERRORS.INVALID_JSON;
  } else if (error?.type === 'entity.too.large') {
    definition = ERRORS.PAYLOAD_TOO_LARGE;
  }
  const metadata = { code: definition.code, statusCode: definition.statusCode };
  if (error instanceof AppError && /^[0-9a-f-]{36}$/.test(error.context?.batchId ?? '')) {
    metadata.batchId = error.context.batchId;
  }
  // Nunca serializar el error, sus causas, req.body, headers o URI de conexión.
  const level = definition.statusCode >= 500 ? 'error' : 'warning';
  logger.log(level, 'API_ERROR', metadata);
  res.status(definition.statusCode).json({
    status: 'error', error: definition.code, message: definition.message,
  });
}
