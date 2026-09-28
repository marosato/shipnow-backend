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
  // Puente hasta Winston en M4: solo metadatos controlados, sin causas ni cuerpos.
  if (definition.statusCode >= 500) {
    console.error('API_ERROR', { code: definition.code,
      ...(error instanceof AppError && error.context?.batchId
        ? { batchId: error.context.batchId } : {}) });
  }
  res.status(definition.statusCode).json({
    status: 'error', error: definition.code, message: definition.message,
  });
}
