import { MOCK_LIMITS } from '../constants/index.js';

// Única fuente de códigos, mensajes públicos y estados HTTP.
export const ERRORS = Object.freeze({
  INVALID_BODY: Object.freeze({ code: 'INVALID_BODY', statusCode: 400, message: "Se requiere un objeto JSON con campos permitidos." }),
  INVALID_TEXT: Object.freeze({ code: 'INVALID_TEXT', statusCode: 400, message: "Los campos de texto obligatorios están vacíos o superan el largo permitido." }),
  INVALID_ID: Object.freeze({ code: 'INVALID_ID', statusCode: 400, message: "El identificador debe contener 24 caracteres hexadecimales." }),
  INVALID_QUERY: Object.freeze({ code: 'INVALID_QUERY', statusCode: 400, message: "Los parámetros de consulta no están permitidos o tienen un formato inválido." }),
  INVALID_PAGINATION: Object.freeze({ code: 'INVALID_PAGINATION', statusCode: 400, message: "page y limit deben ser enteros positivos dentro de los límites permitidos." }),
  INVALID_EMAIL: Object.freeze({ code: 'INVALID_EMAIL', statusCode: 400, message: "email tiene un formato inválido." }),
  INVALID_PRICE: Object.freeze({ code: 'INVALID_PRICE', statusCode: 400, message: "price debe ser un número finito no negativo." }),
  INVALID_STOCK: Object.freeze({ code: 'INVALID_STOCK', statusCode: 400, message: "stock debe ser un entero no negativo." }),
  USER_NOT_FOUND: Object.freeze({ code: 'USER_NOT_FOUND', statusCode: 404, message: "Usuario no encontrado." }),
  PRODUCT_NOT_FOUND: Object.freeze({ code: 'PRODUCT_NOT_FOUND', statusCode: 404, message: "Producto no encontrado." }),
  ROUTE_NOT_FOUND: Object.freeze({ code: 'ROUTE_NOT_FOUND', statusCode: 404, message: "Ruta no encontrada." }),
  INVALID_MOCK_AMOUNT: Object.freeze({ code: 'INVALID_MOCK_AMOUNT', statusCode: 400, message: `qty debe ser un entero entre 1 y ${MOCK_LIMITS.MAX_QTY}.` }),
  INVALID_MOCK_INPUT: Object.freeze({ code: 'INVALID_MOCK_INPUT', statusCode: 400, message: "En seed, qty se envía únicamente en el body JSON." }),
  MOCK_LOAD_FAILED: Object.freeze({ code: 'MOCK_LOAD_FAILED', statusCode: 500, message: "Falló la carga del lote; sus registros fueron retirados." }),
  MOCK_CLEANUP_FAILED: Object.freeze({ code: 'MOCK_CLEANUP_FAILED', statusCode: 500, message: "No se completó la carga ni la limpieza del lote. Requiere revisión." }),
  DUPLICATE_RESOURCE: Object.freeze({ code: 'DUPLICATE_RESOURCE', statusCode: 409, message: "El registro ya existe." }),
  INVALID_DATA: Object.freeze({ code: 'INVALID_DATA', statusCode: 400, message: "Datos inválidos." }),
  INVALID_JSON: Object.freeze({ code: 'INVALID_JSON', statusCode: 400, message: "JSON inválido." }),
  PAYLOAD_TOO_LARGE: Object.freeze({ code: 'PAYLOAD_TOO_LARGE', statusCode: 413, message: "El cuerpo de la petición supera el límite permitido." }),
  INTERNAL_ERROR: Object.freeze({ code: 'INTERNAL_ERROR', statusCode: 500, message: "Error interno del servidor." }),
});
