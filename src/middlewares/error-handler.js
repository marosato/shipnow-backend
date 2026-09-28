import { AppError } from '../errors/app-error.js';

// Puente mínimo para M1; M3 incorporará el diccionario de errores del dominio.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let statusCode = 500;
  let message = 'Error interno del servidor.';
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'El registro ya existe.';
  } else if (error.name === 'ValidationError' || error.name === 'CastError') {
    statusCode = 400;
    message = 'Datos inválidos.';
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'JSON inválido.';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'El cuerpo de la petición supera el límite permitido.';
  }
  if (statusCode === 500) console.error('Error interno de la API.');
  res.status(statusCode).json({ status: 'error', message });
}
