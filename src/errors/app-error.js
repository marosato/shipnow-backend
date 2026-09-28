// Soporte mínimo de M1. El catálogo de errores se desarrolla en M3.
export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}
