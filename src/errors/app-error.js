import { ERRORS } from './error-catalog.js';

export class AppError extends Error {
  constructor(definition, { cause, context } = {}) {
    if (!Object.values(ERRORS).includes(definition)) {
      throw new TypeError('AppError requiere una definición del catálogo.');
    }
    super(definition.message, { cause });
    this.name = 'AppError';
    this.code = definition.code;
    this.statusCode = definition.statusCode;
    // Metadatos internos; nunca se serializan automáticamente en la respuesta.
    this.context = context;
  }
}
