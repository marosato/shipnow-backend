import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';
import { ERRORS } from '../errors/error-catalog.js';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

export function createSwaggerSpec({ mocksEnabled = false, loggerTestEnabled = false, port = 8080 } = {}) {
  const files = ['schemas', 'users', 'products'];
  if (mocksEnabled) files.push('mocks');
  if (loggerTestEnabled) files.push('logger');
  // El catálogo M3 es la fuente de ejemplos, códigos y mensajes públicos.
  const schemas = {
    ErrorResponse: {
      type: 'object', required: ['status', 'error', 'message'], additionalProperties: false,
      properties: {
        status: { type: 'string', enum: ['error'] },
        error: { type: 'string', enum: Object.keys(ERRORS) },
        message: { type: 'string' },
      },
    },
  };
  const examples = {};
  for (const { code, message } of Object.values(ERRORS)) {
    schemas[`Error_${code}`] = {
      allOf: [{ $ref: '#/components/schemas/ErrorResponse' }, {
        type: 'object', properties: { error: { type: 'string', enum: [code] } },
      }],
    };
    examples[code] = { value: { status: 'error', error: code, message } };
  }
  return swaggerJSDoc({
    failOnErrors: true,
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'ShipNow API', version,
        description: 'API académica de logística. Users y Products: crear, listar y consultar. '
          + 'Orders y Deliveries: schemas y datos de mocks; no tienen rutas propias ni cambio de estado todavía. '
          + 'No hay autenticación implementada: no se documentan tokens ni errores 401/403 ficticios. '
          + 'La documentación muestra solo las rutas habilitadas. Si Mocks o Logger están apagados, sus rutas devuelven 404 ROUTE_NOT_FOUND. '
          + 'En producción se deshabilitan mediante la configuración validada. '
          + 'Los POST disponibles escriben datos: probar en una base de desarrollo. '
          + 'Todo cuerpo JSON está limitado a 100 KiB; JSON malformado devuelve 400 INVALID_JSON y exceso devuelve 413 PAYLOAD_TOO_LARGE, incluso antes del router.',
      },
      servers: [
        { url: '/', description: 'Servidor actual (conserva host y puerto del navegador)' },
        { url: `http://127.0.0.1:${port}`, description: 'Servidor local' },
      ],
      tags: [
        { name: 'Users', description: 'Usuarios; altas con rol user y email único.' },
        { name: 'Products', description: 'Productos; estado derivado del stock.' },
        { name: 'Orders', description: 'Pedidos representados en MockDataset. Sin endpoints propios en v0.5.0.' },
        { name: 'Deliveries', description: 'Entregas representadas en MockDataset. Sin endpoints propios en v0.5.0.' },
        { name: 'Mocks', description: mocksEnabled ? 'Herramientas locales habilitadas; seed persiste datos.' : 'Deshabilitado en esta instancia; las rutas devuelven 404 ROUTE_NOT_FOUND.' },
        { name: 'Logger', description: loggerTestEnabled ? 'Prueba local habilitada.' : 'Deshabilitado en esta instancia; /loggerTest devuelve 404 ROUTE_NOT_FOUND.' },
      ],
      components: { schemas, examples },
    },
    // Rutas absolutas, independientes del cwd y compatibles con Windows.
    apis: files.map(name => fileURLToPath(new URL(`./${name}.yaml`, import.meta.url)).replaceAll('\\', '/')),
  });
}
