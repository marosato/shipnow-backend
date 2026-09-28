# Código del Módulo 5

Versión 0.5.0 con corrección del cierre de logs del 28/09/2026. Cambios respecto del commit 578289f.

## package.json

```json
{
  "name": "shipnow-backend",
  "version": "0.5.0",
  "private": true,
  "type": "module",
  "description": "Backend III - Módulos 1 a 5",
  "engines": {
    "node": ">=24 <25"
  },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "mocha --timeout 10000 \"tests/**/*.test.js\"",
    "test:integration": "mocha --no-parallel --require ./tests/integration.setup.js --timeout 15000 \"tests/*mongodb.js\""
  },
  "dependencies": {
    "@faker-js/faker": "10.6.0",
    "dotenv": "17.4.2",
    "express": "5.2.1",
    "mongoose": "9.10.1",
    "swagger-jsdoc": "6.3.0",
    "swagger-ui-express": "5.0.1",
    "winston": "3.19.0",
    "winston-daily-rotate-file": "5.0.0"
  },
  "devDependencies": {
    "@apidevtools/swagger-parser": "13.1.0",
    "ajv": "8.20.0",
    "ajv-formats": "3.0.1",
    "chai": "6.2.2",
    "mocha": "12.0.1",
    "supertest": "7.2.2"
  }
}
```

## src/app.js

```javascript
import { createDocsRouter } from './routes/docs.router.js';
import loggerRouter from './routes/logger.router.js';
import { requestLogger } from './middlewares/request-logger.js';
import { ERRORS } from './errors/error-catalog.js';
import express from 'express';
import usersRouter from './routes/users.router.js';
import productsRouter from './routes/products.router.js';
import mocksRouter from './routes/mocks.router.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';

export function createApp({ mocksEnabled = false, loggerTestEnabled = false, port = 8080 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));
  if (loggerTestEnabled) app.use(loggerRouter);
  // Guardar el prefijo antes de que Express lo restaure al derivar un error.
  const mount = (path, router) => app.use(path, (req, res, next) => {
    res.locals.logBase = path;
    next();
  }, router);
  mount('/api/docs', createDocsRouter({ mocksEnabled, loggerTestEnabled, port }));
  mount('/api/users', usersRouter);
  mount('/api/products', productsRouter);
  if (mocksEnabled) mount('/api/mocks', mocksRouter);
  app.use((req, res, next) => next(new AppError(ERRORS.ROUTE_NOT_FOUND)));
  app.use(errorHandler);
  return app;
}

export default createApp();
```

## src/config/logger.config.js

```javascript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const LOG_LEVELS = Object.freeze({ fatal: 0, error: 1, warning: 2, info: 3, http: 4, debug: 5 });
export const LOG_POLICY = Object.freeze({ maxsize: '5m', maxFiles: 5 });
export const LOG_DIRECTORY = fileURLToPath(new URL('../../logs/', import.meta.url));

function options({ nodeEnv = 'test', silent = false, files = true,
  directory = LOG_DIRECTORY, maxsize = LOG_POLICY.maxsize,
  maxFiles = LOG_POLICY.maxFiles, consoleStream } = {}) {
  const consoleLevel = nodeEnv === 'development' ? 'debug' : 'info';
  const outputs = [consoleStream
    ? new winston.transports.Stream({ stream: consoleStream, level: consoleLevel })
    : new winston.transports.Console({ level: consoleLevel })];
  if (files) {
    mkdirSync(directory, { recursive: true });
    outputs.push(new DailyRotateFile({ dirname: directory, filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD', utc: true, level: 'error', maxSize: maxsize, maxFiles,
      auditFile: join(directory, 'rotation-audit.json') }));
  }
  return { levels: LOG_LEVELS, level: 'debug', silent,
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: outputs, exitOnError: false };
}

function handleTransportError() {
  // Último recurso centralizado: no intentar registrar un fallo del logger en sí mismo.
  process.stderr.write('LOGGER_FAILURE: no se pudo escribir un registro.\n');
}

export function createLogger(config) {
  const instance = winston.createLogger(options(config));
  instance.on('error', handleTransportError);
  return instance;
}

// Importar app/services en tests no abre archivos ni carga el entorno.
export const logger = createLogger({ silent: true, files: false });

export function configureLogger(config) {
  let configuration;
  try { configuration = options(config); }
  catch (error) {
    logger.configure(options({ nodeEnv: 'production', files: false }));
    logger.fatal('LOGGER_SETUP_FAILED');
    throw error;
  }
  for (const transport of logger.transports) transport.close?.();
  logger.configure(configuration);
  return logger;
}

export function closeLogger(instance = logger) {
  // Winston puede desasociar transports antes de emitir finish.
  // Conservarlos antes de end evita perder la referencia al archivo pendiente.
  const fileTransports = instance.transports.filter(t => t instanceof DailyRotateFile);
  return new Promise((resolve, reject) => {
    instance.once('finish', () => {
      // finish del logger/transport no garantiza que fs.WriteStream haya terminado.
      // Esperar el callback del flujo de archivo; end admite callbacks posteriores.
      const pending = fileTransports.map(transport => new Promise((done, fail) => {
        transport.logStream.end(error => error ? fail(error) : done());
      }));
      Promise.all(pending).then(() => {
        instance.close();
        resolve();
      }, reject);
    });
    instance.end();
  });
}
```

## src/docs/logger.yaml

```yaml
paths:
  /loggerTest:
    get:
      tags:
      - Logger
      operationId: testLogger
      summary: Emitir seis niveles de prueba
      description: 'Herramienta local de validación, no operación de negocio. ENABLE_LOGGER_TEST=true
        fuera de production. Emite eventos simulated=true; fatal no detiene el servidor. Consola development:
        seis niveles. Archivo: error/fatal; escritura asíncrona.'
      responses:
        '200':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoggerResponse'
        '500':
          description: 'INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
```

## src/docs/mocks.yaml

```yaml
paths:
  /api/mocks/dataset:
    get:
      tags:
      - Mocks
      - Orders
      - Deliveries
      operationId: previewDataset
      summary: Generar lote sin persistir
      description: Disponible con ENABLE_MOCKS=true fuera de production. Genera qty usuarios, repartidores,
        pedidos y entregas; 4 × qty documentos. No guarda en MongoDB. IDs y relaciones coherentes dentro
        del lote.
      responses:
        '200':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DatasetResponse'
        '400':
          description: 'INVALID_QUERY. INVALID_MOCK_AMOUNT. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INVALID_QUERY'
                - $ref: '#/components/schemas/Error_INVALID_MOCK_AMOUNT'
              examples:
                INVALID_QUERY:
                  $ref: '#/components/examples/INVALID_QUERY'
                INVALID_MOCK_AMOUNT:
                  $ref: '#/components/examples/INVALID_MOCK_AMOUNT'
        '500':
          description: 'INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
      parameters:
      - $ref: '#/components/parameters/Qty'
  /api/mocks/users:
    get:
      tags:
      - Mocks
      operationId: previewUsers
      summary: Generar usuarios sin persistir
      description: Disponible con ENABLE_MOCKS=true fuera de production. Devuelve un array de qty usuarios
        con role=user, sin timestamps.
      responses:
        '200':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MockUsersResponse'
        '400':
          description: 'INVALID_QUERY. INVALID_MOCK_AMOUNT. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INVALID_QUERY'
                - $ref: '#/components/schemas/Error_INVALID_MOCK_AMOUNT'
              examples:
                INVALID_QUERY:
                  $ref: '#/components/examples/INVALID_QUERY'
                INVALID_MOCK_AMOUNT:
                  $ref: '#/components/examples/INVALID_MOCK_AMOUNT'
        '500':
          description: 'INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
      parameters:
      - $ref: '#/components/parameters/Qty'
  /api/mocks/seed:
    post:
      tags:
      - Mocks
      - Orders
      - Deliveries
      operationId: seedDataset
      summary: Insertar un lote de prueba
      description: 'MODIFICA MongoDB: inserta qty documentos por entidad (total 4 × qty). ENABLE_MOCKS=true
        fuera de production. qty va solo en JSON; cualquier query se rechaza. Cada petición agrega un
        lote nuevo; no es idempotente. Compensación por lote, sin transacción; si falla limpieza requiere
        revisión mediante logs. Usar base de desarrollo descartable.'
      responses:
        '201':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SeedResponse'
        '400':
          description: 'INVALID_BODY. INVALID_MOCK_AMOUNT. INVALID_MOCK_INPUT. INVALID_JSON. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INVALID_BODY'
                - $ref: '#/components/schemas/Error_INVALID_MOCK_AMOUNT'
                - $ref: '#/components/schemas/Error_INVALID_MOCK_INPUT'
                - $ref: '#/components/schemas/Error_INVALID_JSON'
              examples:
                INVALID_BODY:
                  $ref: '#/components/examples/INVALID_BODY'
                INVALID_MOCK_AMOUNT:
                  $ref: '#/components/examples/INVALID_MOCK_AMOUNT'
                INVALID_MOCK_INPUT:
                  $ref: '#/components/examples/INVALID_MOCK_INPUT'
                INVALID_JSON:
                  $ref: '#/components/examples/INVALID_JSON'
        '413':
          description: 'PAYLOAD_TOO_LARGE. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_PAYLOAD_TOO_LARGE'
              examples:
                PAYLOAD_TOO_LARGE:
                  $ref: '#/components/examples/PAYLOAD_TOO_LARGE'
        '500':
          description: 'MOCK_LOAD_FAILED. MOCK_CLEANUP_FAILED. INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_MOCK_LOAD_FAILED'
                - $ref: '#/components/schemas/Error_MOCK_CLEANUP_FAILED'
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                MOCK_LOAD_FAILED:
                  $ref: '#/components/examples/MOCK_LOAD_FAILED'
                MOCK_CLEANUP_FAILED:
                  $ref: '#/components/examples/MOCK_CLEANUP_FAILED'
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
      requestBody:
        required: true
        description: JSON; límite de 100 KiB. No se admiten campos adicionales.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MockSeedInput'
```

## src/docs/products.yaml

```yaml
paths:
  /api/products:
    get:
      tags:
      - Products
      operationId: listProducts
      summary: Listar Products
      description: Lista ordenada por _id ascendente. data es un array sin total. Solo admite page y limit.
      responses:
        '200':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductsResponse'
        '400':
          description: 'INVALID_QUERY. INVALID_PAGINATION. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INVALID_QUERY'
                - $ref: '#/components/schemas/Error_INVALID_PAGINATION'
              examples:
                INVALID_QUERY:
                  $ref: '#/components/examples/INVALID_QUERY'
                INVALID_PAGINATION:
                  $ref: '#/components/examples/INVALID_PAGINATION'
        '500':
          description: 'INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
      parameters:
      - $ref: '#/components/parameters/Page'
      - $ref: '#/components/parameters/Limit'
    post:
      tags:
      - Products
      operationId: createProduct
      summary: Crear Product
      description: status se deriva del stock; no admite status. price y stock deben ser números JSON.
      responses:
        '201':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductResponse'
        '400':
          description: 'INVALID_BODY. INVALID_TEXT. INVALID_PRICE. INVALID_STOCK. INVALID_DATA. INVALID_JSON. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INVALID_BODY'
                - $ref: '#/components/schemas/Error_INVALID_TEXT'
                - $ref: '#/components/schemas/Error_INVALID_PRICE'
                - $ref: '#/components/schemas/Error_INVALID_STOCK'
                - $ref: '#/components/schemas/Error_INVALID_DATA'
                - $ref: '#/components/schemas/Error_INVALID_JSON'
              examples:
                INVALID_BODY:
                  $ref: '#/components/examples/INVALID_BODY'
                INVALID_TEXT:
                  $ref: '#/components/examples/INVALID_TEXT'
                INVALID_PRICE:
                  $ref: '#/components/examples/INVALID_PRICE'
                INVALID_STOCK:
                  $ref: '#/components/examples/INVALID_STOCK'
                INVALID_DATA:
                  $ref: '#/components/examples/INVALID_DATA'
                INVALID_JSON:
                  $ref: '#/components/examples/INVALID_JSON'
        '413':
          description: 'PAYLOAD_TOO_LARGE. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_PAYLOAD_TOO_LARGE'
              examples:
                PAYLOAD_TOO_LARGE:
                  $ref: '#/components/examples/PAYLOAD_TOO_LARGE'
        '500':
          description: 'INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
      requestBody:
        required: true
        description: JSON; límite de 100 KiB. No se admiten campos adicionales.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductInput'
  /api/products/{id}:
    get:
      tags:
      - Products
      operationId: getProduct
      summary: Consultar Product por ID
      description: Devuelve el recurso si existe.
      responses:
        '200':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductResponse'
        '400':
          description: 'INVALID_ID. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INVALID_ID'
              examples:
                INVALID_ID:
                  $ref: '#/components/examples/INVALID_ID'
        '404':
          description: 'PRODUCT_NOT_FOUND. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_PRODUCT_NOT_FOUND'
              examples:
                PRODUCT_NOT_FOUND:
                  $ref: '#/components/examples/PRODUCT_NOT_FOUND'
        '500':
          description: 'INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
      parameters:
      - $ref: '#/components/parameters/Id'
```

## src/docs/schemas.yaml

```yaml
components:
  schemas:
    ObjectId:
      type: string
      pattern: ^[a-fA-F0-9]{24}$
      example: 507f1f77bcf86cd799439011
    SuccessResponse:
      type: object
      required:
      - status
      - data
      properties:
        status:
          type: string
          enum:
          - success
        data: {}
    User:
      type: object
      required:
      - _id
      - name
      - email
      - role
      - createdAt
      - updatedAt
      properties:
        _id:
          $ref: '#/components/schemas/ObjectId'
        name:
          type: string
          minLength: 1
          maxLength: 120
        email:
          type: string
        role:
          type: string
          enum:
          - admin
          - user
          - driver
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
      additionalProperties: false
    Product:
      type: object
      required:
      - _id
      - name
      - price
      - stock
      - status
      - createdAt
      - updatedAt
      properties:
        _id:
          $ref: '#/components/schemas/ObjectId'
        name:
          type: string
          minLength: 1
          maxLength: 120
        price:
          type: number
          minimum: 0
        stock:
          type: integer
          minimum: 0
          maximum: 9007199254740991
        status:
          type: string
          enum:
          - available
          - out_of_stock
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
      additionalProperties: false
    UserInput:
      type: object
      required:
      - name
      - email
      properties:
        name:
          type: string
          description: Texto no vacío luego de trim; máximo 120 caracteres después de normalizar.
          example: Ana Pérez
        email:
          type: string
          description: Texto; trim, minúsculas y validación de email. Máximo 254 después de trim. Debe
            ser único.
          example: ana@example.com
      additionalProperties: false
    ProductInput:
      type: object
      required:
      - name
      - price
      - stock
      properties:
        name:
          type: string
          description: Texto no vacío; máximo 120 caracteres después de trim.
          example: Caja mediana
        price:
          type: number
          minimum: 0
          example: 1500
        stock:
          type: integer
          minimum: 0
          maximum: 9007199254740991
          example: 3
      additionalProperties: false
    MockUser:
      type: object
      required:
      - _id
      - name
      - email
      - role
      - mockBatchId
      properties:
        _id:
          $ref: '#/components/schemas/ObjectId'
        name:
          type: string
          minLength: 1
          maxLength: 120
        email:
          type: string
        role:
          type: string
          enum:
          - user
          - driver
        mockBatchId:
          type: string
          format: uuid
      additionalProperties: false
    OrderItem:
      type: object
      required:
      - name
      - quantity
      - unitPrice
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 120
        quantity:
          type: integer
          minimum: 1
          maximum: 9007199254740991
        unitPrice:
          type: number
          minimum: 0
      additionalProperties: false
    Order:
      type: object
      required:
      - _id
      - userId
      - address
      - items
      - total
      - status
      - priority
      - mockBatchId
      properties:
        _id:
          $ref: '#/components/schemas/ObjectId'
        userId:
          $ref: '#/components/schemas/ObjectId'
        address:
          type: string
          maxLength: 250
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
          minItems: 1
        total:
          type: number
          minimum: 0
        status:
          type: string
          enum:
          - pending
          - assigned
          - in_transit
          - delivered
          - cancelled
        priority:
          type: string
          enum:
          - low
          - normal
          - high
        mockBatchId:
          type: string
          format: uuid
      additionalProperties: false
      description: Pedido generado en la vista previa de mocks, sin timestamps. No existe un endpoint
        propio de pedidos en esta versión.
    Delivery:
      type: object
      required:
      - _id
      - orderId
      - driverId
      - status
      - priority
      - mockBatchId
      properties:
        _id:
          $ref: '#/components/schemas/ObjectId'
        orderId:
          $ref: '#/components/schemas/ObjectId'
        driverId:
          type: string
          pattern: ^[a-fA-F0-9]{24}$
          example: 507f1f77bcf86cd799439011
          nullable: true
          description: null para pending/cancelled; ObjectId para los demás estados.
        status:
          type: string
          enum:
          - pending
          - assigned
          - in_transit
          - delivered
          - cancelled
        priority:
          type: string
          enum:
          - low
          - normal
          - high
        mockBatchId:
          type: string
          format: uuid
      additionalProperties: false
      description: Entrega generada en mocks, sin timestamps. No existe un endpoint propio de entregas
        en esta versión.
    MockDataset:
      type: object
      required:
      - batchId
      - users
      - drivers
      - orders
      - deliveries
      properties:
        batchId:
          type: string
          format: uuid
        users:
          type: array
          items:
            $ref: '#/components/schemas/MockUser'
        drivers:
          type: array
          items:
            $ref: '#/components/schemas/MockUser'
        orders:
          type: array
          items:
            $ref: '#/components/schemas/Order'
        deliveries:
          type: array
          items:
            $ref: '#/components/schemas/Delivery'
      additionalProperties: false
    MockSeedInput:
      type: object
      required:
      - qty
      properties:
        qty:
          type: integer
          minimum: 1
          maximum: 100
          example: 2
      additionalProperties: false
    MockSeedResult:
      type: object
      required:
      - batchId
      - inserted
      - ids
      properties:
        batchId:
          type: string
          format: uuid
        inserted:
          type: object
          required:
          - users
          - drivers
          - orders
          - deliveries
          - total
          properties:
            users:
              type: integer
              minimum: 1
              maximum: 100
            drivers:
              type: integer
              minimum: 1
              maximum: 100
            orders:
              type: integer
              minimum: 1
              maximum: 100
            deliveries:
              type: integer
              minimum: 1
              maximum: 100
            total:
              type: integer
              minimum: 1
              maximum: 400
          additionalProperties: false
        ids:
          type: object
          required:
          - users
          - drivers
          - orders
          - deliveries
          properties:
            users:
              type: array
              items:
                $ref: '#/components/schemas/ObjectId'
            drivers:
              type: array
              items:
                $ref: '#/components/schemas/ObjectId'
            orders:
              type: array
              items:
                $ref: '#/components/schemas/ObjectId'
            deliveries:
              type: array
              items:
                $ref: '#/components/schemas/ObjectId'
          additionalProperties: false
      additionalProperties: false
    LoggerResult:
      type: object
      required:
      - message
      - levels
      properties:
        message:
          type: string
          enum:
          - Logs de prueba generados.
        levels:
          type: array
          items:
            type: string
            enum:
            - fatal
            - error
            - warning
            - info
            - http
            - debug
          minItems: 6
          maxItems: 6
          uniqueItems: true
      additionalProperties: false
    UserResponse:
      allOf:
      - $ref: '#/components/schemas/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/components/schemas/User'
    UsersResponse:
      allOf:
      - $ref: '#/components/schemas/SuccessResponse'
      - type: object
        properties:
          data:
            type: array
            items:
              $ref: '#/components/schemas/User'
    ProductResponse:
      allOf:
      - $ref: '#/components/schemas/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/components/schemas/Product'
    ProductsResponse:
      allOf:
      - $ref: '#/components/schemas/SuccessResponse'
      - type: object
        properties:
          data:
            type: array
            items:
              $ref: '#/components/schemas/Product'
    DatasetResponse:
      allOf:
      - $ref: '#/components/schemas/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/components/schemas/MockDataset'
    MockUsersResponse:
      allOf:
      - $ref: '#/components/schemas/SuccessResponse'
      - type: object
        properties:
          data:
            type: array
            items:
              $ref: '#/components/schemas/MockUser'
    SeedResponse:
      allOf:
      - $ref: '#/components/schemas/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/components/schemas/MockSeedResult'
    LoggerResponse:
      allOf:
      - $ref: '#/components/schemas/SuccessResponse'
      - type: object
        properties:
          data:
            $ref: '#/components/schemas/LoggerResult'
  parameters:
    Id:
      name: id
      in: path
      required: true
      description: Identificador hexadecimal de 24 caracteres.
      schema:
        $ref: '#/components/schemas/ObjectId'
    Page:
      name: page
      in: query
      description: Entero positivo, sin ceros iniciales ni repeticiones.
      schema:
        type: integer
        minimum: 1
        maximum: 1000000
        default: 1
    Limit:
      name: limit
      in: query
      description: Entero positivo, sin ceros iniciales ni repeticiones.
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
    Qty:
      name: qty
      in: query
      description: Cantidad por entidad. Sin ceros iniciales ni repeticiones; no admite otros parámetros.
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 10
```

## src/docs/swagger.config.js

```javascript
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
```

## src/docs/users.yaml

```yaml
paths:
  /api/users:
    get:
      tags:
      - Users
      operationId: listUsers
      summary: Listar Users
      description: Lista ordenada por _id ascendente. data es un array sin total. Solo admite page y limit.
      responses:
        '200':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsersResponse'
        '400':
          description: 'INVALID_QUERY. INVALID_PAGINATION. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INVALID_QUERY'
                - $ref: '#/components/schemas/Error_INVALID_PAGINATION'
              examples:
                INVALID_QUERY:
                  $ref: '#/components/examples/INVALID_QUERY'
                INVALID_PAGINATION:
                  $ref: '#/components/examples/INVALID_PAGINATION'
        '500':
          description: 'INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
      parameters:
      - $ref: '#/components/parameters/Page'
      - $ref: '#/components/parameters/Limit'
    post:
      tags:
      - Users
      operationId: createUser
      summary: Crear User
      description: Se asigna role=user; no admite role.
      responses:
        '201':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '400':
          description: 'INVALID_BODY. INVALID_TEXT. INVALID_EMAIL. INVALID_DATA. INVALID_JSON. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INVALID_BODY'
                - $ref: '#/components/schemas/Error_INVALID_TEXT'
                - $ref: '#/components/schemas/Error_INVALID_EMAIL'
                - $ref: '#/components/schemas/Error_INVALID_DATA'
                - $ref: '#/components/schemas/Error_INVALID_JSON'
              examples:
                INVALID_BODY:
                  $ref: '#/components/examples/INVALID_BODY'
                INVALID_TEXT:
                  $ref: '#/components/examples/INVALID_TEXT'
                INVALID_EMAIL:
                  $ref: '#/components/examples/INVALID_EMAIL'
                INVALID_DATA:
                  $ref: '#/components/examples/INVALID_DATA'
                INVALID_JSON:
                  $ref: '#/components/examples/INVALID_JSON'
        '409':
          description: 'DUPLICATE_RESOURCE. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_DUPLICATE_RESOURCE'
              examples:
                DUPLICATE_RESOURCE:
                  $ref: '#/components/examples/DUPLICATE_RESOURCE'
        '413':
          description: 'PAYLOAD_TOO_LARGE. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_PAYLOAD_TOO_LARGE'
              examples:
                PAYLOAD_TOO_LARGE:
                  $ref: '#/components/examples/PAYLOAD_TOO_LARGE'
        '500':
          description: 'INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
      requestBody:
        required: true
        description: JSON; límite de 100 KiB. No se admiten campos adicionales.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserInput'
  /api/users/{id}:
    get:
      tags:
      - Users
      operationId: getUser
      summary: Consultar User por ID
      description: Devuelve el recurso si existe.
      responses:
        '200':
          description: Operación exitosa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '400':
          description: 'INVALID_ID. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INVALID_ID'
              examples:
                INVALID_ID:
                  $ref: '#/components/examples/INVALID_ID'
        '404':
          description: 'USER_NOT_FOUND. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_USER_NOT_FOUND'
              examples:
                USER_NOT_FOUND:
                  $ref: '#/components/examples/USER_NOT_FOUND'
        '500':
          description: 'INTERNAL_ERROR. '
          content:
            application/json:
              schema:
                oneOf:
                - $ref: '#/components/schemas/Error_INTERNAL_ERROR'
              examples:
                INTERNAL_ERROR:
                  $ref: '#/components/examples/INTERNAL_ERROR'
      parameters:
      - $ref: '#/components/parameters/Id'
```

## src/routes/docs.router.js

```javascript
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { createSwaggerSpec } from '../docs/swagger.config.js';

export function createDocsRouter(options) {
  const router = Router();
  const spec = createSwaggerSpec(options);
  router.get('/openapi.json', (req, res) => res.json(spec));
  // serveFiles mantiene la especificación aislada por instancia de Express.
  router.use('/', swaggerUi.serveFiles(spec), swaggerUi.setup(spec, {
    customSiteTitle: 'ShipNow · API Docs',
    swaggerOptions: { validatorUrl: null, persistAuthorization: false },
  }));
  return router;
}
```

## src/server.js

```javascript
import { logger, configureLogger, closeLogger } from './config/logger.config.js';
import { createApp } from './app.js';
import { initialize as initializeOrders } from './repositories/order.repository.js';
import { initialize as initializeDeliveries } from './repositories/delivery.repository.js';
import { loadConfig } from './config/env.config.js';
import { connectDatabase, disconnectDatabase } from './config/db.config.js';
import { initialize as initializeUsers } from './repositories/user.repository.js';
import { initialize as initializeProducts } from './repositories/product.repository.js';

let startupStage = 'logger';

async function start() {
  // Permite registrar incluso fallos de validación, sin imprimir valores del entorno.
  configureLogger({ nodeEnv: 'production' });
  startupStage = 'configuration';
  const config = loadConfig();
  configureLogger(config);
  startupStage = 'database';
  try {
    await connectDatabase(config.mongodbUri);
    const results = await Promise.allSettled([initializeUsers(), initializeProducts(), initializeOrders(), initializeDeliveries()]);
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
  } catch {
    throw new Error('No se pudo preparar MongoDB. Verifique conexión, permisos e índices.');
  }
  const app = createApp(config);
  const server = app.listen(config.port, '127.0.0.1', () => {
    logger.info('SERVER_STARTED', { port: config.port, address: `ShipNow M5 disponible en http://127.0.0.1:${config.port}` });
  });
  server.on('error', async () => {
    logger.fatal('HTTP_LISTEN_FAILED', { port: config.port });
    await disconnectDatabase();
    await closeLogger();
    process.exitCode = 1;
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      try { await disconnectDatabase(); }
      finally { logger.info('SERVER_STOPPED'); await closeLogger(); clearTimeout(timeout); }
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(async (error) => {
  logger.fatal('STARTUP_FAILED', { stage: startupStage,
    ...(startupStage === 'configuration' && error.message.startsWith('Configuración inválida:')
      ? { reason: error.message } : {}) });
  await disconnectDatabase();
  await closeLogger();
  process.exitCode = 1;
});
```

## tests/docs.test.js

```javascript
import { expect } from 'chai';
import request from 'supertest';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createApp } from '../src/app.js';
import { createSwaggerSpec } from '../src/docs/swagger.config.js';
import { validateEnv } from '../src/config/env.config.js';
import { ERRORS } from '../src/errors/error-catalog.js';

const options = { mocksEnabled: true, loggerTestEnabled: true };
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
let spec;

function matchesResponse(path, method, response) {
  const schema = spec.paths[path][method].responses[response.status].content['application/json'].schema;
  const validate = ajv.compile(schema);
  expect(validate(response.body), JSON.stringify(validate.errors)).to.equal(true);
}

describe('M5: OpenAPI y documentación HTTP', () => {
  before(async () => { spec = await SwaggerParser.validate(createSwaggerSpec(options)); });

  it('valida referencias, operaciones únicas y cobertura de las diez operaciones existentes', () => {
    const operations = Object.values(spec.paths).flatMap(path => Object.values(path));
    expect(operations).to.have.length(10);
    expect(new Set(operations.map(x => x.operationId)).size).to.equal(10);
    expect(spec.info.version).to.equal('0.5.0');
    expect(spec.paths).not.to.have.property('/api/orders');
    expect(spec.paths).not.to.have.property('/api/deliveries');
    for (const operation of operations) {
      expect(operation.tags).not.to.be.empty;
      expect(operation.description).not.to.be.empty;
      expect(operation.responses).to.have.property('500');
    }
  });

  it('sirve Swagger UI, sus assets y el JSON sin MongoDB', async () => {
    const app = createApp(options);
    await request(app).get('/api/docs').expect(301);
    const html = await request(app).get('/api/docs/').expect(200);
    expect(html.text).to.include('swagger-ui');
    for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-init.js']) {
      const response = await request(app).get(`/api/docs/${asset}`).expect(200);
      expect(response.text.length).to.be.greaterThan(100);
    }
    const json = await request(app).get('/api/docs/openapi.json').expect(200);
    expect(json.body.openapi).to.equal('3.0.3');
    await SwaggerParser.validate(json.body);
  });

  it('omite rutas apagadas y documenta solo las habilitadas en producción', async () => {
    const config = validateEnv({ PORT: '9090', NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost/demo', ENABLE_MOCKS: 'true', ENABLE_LOGGER_TEST: 'true' });
    const app = createApp(config);
    const { body } = await request(app).get('/api/docs/openapi.json').expect(200);
    expect(Object.keys(body.paths)).to.deep.equal(['/api/users', '/api/users/{id}', '/api/products', '/api/products/{id}']);
    expect(body.servers[1].url).to.equal('http://127.0.0.1:9090');
    for (const path of ['/loggerTest', '/api/mocks/dataset']) {
      const response = await request(app).get(path).expect(404);
      expect(response.body.error).to.equal('ROUTE_NOT_FOUND');
    }
  });

  it('aísla documentos de dos apps con flags distintos', async () => {
    const enabled = createApp(options);
    const disabled = createApp();
    const first = await request(enabled).get('/api/docs/swagger-ui-init.js');
    await request(disabled).get('/api/docs/swagger-ui-init.js');
    const again = await request(enabled).get('/api/docs/swagger-ui-init.js');
    expect(first.text).to.equal(again.text);
    const { body } = await request(disabled).get('/api/docs/openapi.json');
    expect(body.paths).not.to.have.property('/loggerTest');
  });

  it('carga YAML desde otro directorio de trabajo', () => {
    const moduleUrl = new URL('../src/docs/swagger.config.js', import.meta.url).href;
    const code = `import { createSwaggerSpec } from ${JSON.stringify(moduleUrl)}; console.log(Object.keys(createSwaggerSpec().paths).length);`;
    expect(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: tmpdir(), encoding: 'utf8' }).trim()).to.equal('4');
  });

  it('mantiene todos los ejemplos de errores sincronizados con M3', () => {
    for (const error of Object.values(ERRORS)) {
      expect(spec.components.examples[error.code].value).to.deep.equal({
        status: 'error', error: error.code, message: error.message,
      });
    }
  });

  it('valida respuestas reales de dataset, users mock y logger contra sus schemas', async () => {
    const app = createApp(options);
    for (const path of ['/api/mocks/dataset', '/api/mocks/users', '/loggerTest']) {
      const response = await request(app).get(path + (path.startsWith('/api/mocks') ? '?qty=2' : '')).expect(200);
      matchesResponse(path, 'get', response);
    }
  });

  it('valida errores reales de ID, paginación, body, JSON y cantidades contra lo documentado', async () => {
    const app = createApp(options);
    const cases = [
      ['get', '/api/users/not-an-id', '/api/users/{id}'],
      ['get', '/api/products?limit=101', '/api/products'],
      ['get', '/api/mocks/dataset?qty=-1', '/api/mocks/dataset'],
      ['post', '/api/users', '/api/users', { name: 'Ana', email: 'invalid' }],
      ['post', '/api/products', '/api/products', { name: 'Caja', price: 1, stock: -1 }],
      ['post', '/api/mocks/seed?qty=1', '/api/mocks/seed', { qty: 1 }],
    ];
    for (const [method, url, path, body] of cases) {
      let req = request(app)[method](url);
      if (body) req = req.send(body);
      const response = await req.expect(400);
      matchesResponse(path, method, response);
    }
    const invalid = await request(app).post('/api/users').set('Content-Type', 'application/json').send('{').expect(400);
    matchesResponse('/api/users', 'post', invalid);
    const large = await request(app).post('/api/users').send({ name: 'x'.repeat(110000) }).expect(413);
    matchesResponse('/api/users', 'post', large);
  });
});
```

## tests/helpers/openapi.js

```javascript
import { expect } from 'chai';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createSwaggerSpec } from '../../src/docs/swagger.config.js';

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
let specification;

// Comparar respuestas de MongoDB con el contrato público, sin cambiar el servidor.
export async function expectDocumentedResponse(path, method, response) {
  specification ??= SwaggerParser.validate(createSwaggerSpec({ mocksEnabled: true, loggerTestEnabled: true }));
  const spec = await specification;
  const schema = spec.paths[path][method].responses[response.status].content['application/json'].schema;
  const validate = ajv.compile(schema);
  expect(validate(response.body), JSON.stringify(validate.errors)).to.equal(true);
}
```

## tests/integration.mongodb.js

```javascript
import { expectDocumentedResponse } from './helpers/openapi.js';
import { expect } from 'chai';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
import { USER_ROLES, PRODUCT_STATUS } from '../src/constants/index.js';

// Tests de integración: se permite inspeccionar directamente la persistencia.
const users = [];
const products = [];
describe('Flujos HTTP con MongoDB real y descartable', () => {
  after(async () => {
    if (users.length) await User.deleteMany({ _id: { $in: users } });
    if (products.length) await Product.deleteMany({ _id: { $in: products } });
  });
  it('crea usuario, normaliza email, consulta y rechaza duplicado', async () => {
    const email = `${randomUUID()}@EXAMPLE.COM`;
    const created = await request(app).post('/api/users').send({ name: ' Ana ', email });
    if (created.body.data?._id) users.push(created.body.data._id);
    expect(created.status).to.equal(201);
    await expectDocumentedResponse('/api/users', 'post', created);
    expect(created.body.data).to.include({ name: 'Ana', email: email.toLowerCase(), role: USER_ROLES.USER });
    const found = await request(app).get(`/api/users/${created.body.data._id}`);
    expect(found.status).to.equal(200);
    await expectDocumentedResponse('/api/users/{id}', 'get', found);
    expect(found.body.data.email).to.equal(email.toLowerCase());
    const duplicate = await request(app).post('/api/users').send({ name: 'Ana', email });
    expect(duplicate.status).to.equal(409);
    await expectDocumentedResponse('/api/users', 'post', duplicate);
    expect(duplicate.body.status).to.equal('error');
    expect(duplicate.body.error).to.equal('DUPLICATE_RESOURCE');
  });
  for (const [stock, status] of [[3, PRODUCT_STATUS.AVAILABLE], [0, PRODUCT_STATUS.OUT_OF_STOCK]]) {
    it(`persiste producto con stock ${stock} y estado derivado`, async () => {
      const created = await request(app).post('/api/products').send({ name: 'Caja', price: 12.5, stock });
      if (created.body.data?._id) products.push(created.body.data._id);
      expect(created.status).to.equal(201);
      await expectDocumentedResponse('/api/products', 'post', created);
      expect(created.body.data).to.include({ name: 'Caja', price: 12.5, stock, status });
      const found = await request(app).get(`/api/products/${created.body.data._id}`);
      expect(found.status).to.equal(200);
      await expectDocumentedResponse('/api/products/{id}', 'get', found);
      expect(found.body.data.status).to.equal(status);
      expect(await Product.exists({ _id: created.body.data._id })).not.to.equal(null);
    });
  }
  for (const resource of ['users', 'products']) {
    it(`limita listado de ${resource}`, async () => {
      const response = await request(app).get(`/api/${resource}?limit=1`);
      expect(response.status).to.equal(200);
      await expectDocumentedResponse(`/api/${resource}`, 'get', response);
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.at.most(1);
    });
    it(`devuelve 404 para ${resource} inexistente`, async () => {
      const response = await request(app).get(`/api/${resource}/000000000000000000000000`);
      expect(response.status).to.equal(404);
      await expectDocumentedResponse(`/api/${resource}/{id}`, 'get', response);
      expect(response.body.status).to.equal('error');
      expect(response.body.error).to.equal(resource === 'users' ? 'USER_NOT_FOUND' : 'PRODUCT_NOT_FOUND');
    });
  }
});
```

## tests/logger.test.js

```javascript
import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import { Writable } from 'node:stream';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogger, configureLogger, closeLogger, LOG_LEVELS } from '../src/config/logger.config.js';
import { createApp } from '../src/app.js';
import { validateEnv } from '../src/config/env.config.js';
import { errorHandler } from '../src/middlewares/error-handler.js';

function capture() {
  const lines = [];
  const stream = new Writable({ write(chunk, encoding, done) {
    lines.push(...chunk.toString().trim().split('\n').filter(Boolean).map(line => JSON.parse(line)));
    done();
  } });
  return { stream, lines };
}

describe('M4: Winston y persistencia real en archivos temporales', () => {
  let directory;
  beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'shipnow-logs-')); });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
  for (const nodeEnv of ['development', 'production']) {
    it(`${nodeEnv}: consola filtra niveles y archivo solo persiste error/fatal`, async () => {
      const { stream, lines } = capture();
      const log = createLogger({ nodeEnv, directory, consoleStream: stream });
      for (const level of Object.keys(LOG_LEVELS)) log.log(level, `TEST_${level}`);
      await closeLogger(log);
      expect(lines.map(x => x.level)).to.deep.equal(nodeEnv === 'development'
        ? ['fatal', 'error', 'warning', 'info', 'http', 'debug'] : ['fatal', 'error', 'warning', 'info']);
      const filenames = (await readdir(directory)).filter(name => /^error-.*\.log$/.test(name));
      // Al resolverse closeLogger el archivo ya debe existir y estar completo.
      expect(filenames, 'closeLogger debe esperar la escritura del archivo').to.have.length(1);
      const records = (await readFile(join(directory, filenames[0]), 'utf8'))
        .trim().split('\n').map(JSON.parse);
      expect(records.map(x => x.level)).to.deep.equal(['fatal', 'error']);
      for (const record of records) {
        expect(Number.isNaN(Date.parse(record.timestamp))).to.equal(false);
        expect(record.message).to.match(/^TEST_/);
      }
    });
  }
  it('rota por tamaño y limita la cantidad de archivos', async () => {
    const { stream } = capture();
    const log = createLogger({ nodeEnv: 'production', directory, consoleStream: stream, maxsize: '1k', maxFiles: 3 });
    // Esperar escritura de cada registro para probar rotación, no carreras del productor.
    for (let i = 0; i < 16; i++) {
      log.error('ROTATION_TEST', { sequence: i, padding: 'x'.repeat(180) });
      // logged significa encolado. Esperar evidencia en disco, con límite de tiempo.
      let persisted = false;
      for (let attempt = 0; attempt < 100 && !persisted; attempt++) {
        const names = (await readdir(directory)).filter(name => /^error-.*\.log(?:\.\d+)?$/.test(name));
        const text = (await Promise.all(names.map(name => readFile(join(directory, name), 'utf8')))).join('');
        persisted = text.includes(`"sequence":${i},`) || text.includes(`"sequence":${i}}`);
        if (!persisted) await new Promise(resolve => setTimeout(resolve, 5));
      }
      expect(persisted, `registro ${i} escrito`).to.equal(true);
    }
    await closeLogger(log);
    const files = (await readdir(directory)).filter(name => /^error-.*\.log(?:\.\d+)?$/.test(name));
    expect(files.length).to.be.within(2, 3);
    const contents = (await Promise.all(files.map(name => readFile(join(directory, name), 'utf8')))).join('\n');
    const records = contents.split('\n').filter(Boolean).map(JSON.parse);
    expect(records.some(x => x.sequence === 15)).to.equal(true);
    expect(records.some(x => x.sequence === 0)).to.equal(false);
    expect(records.every(x => x.level === 'error')).to.equal(true);
  });
});

describe('M4: integración del logger con HTTP', () => {
  let lines;
  beforeEach(() => {
    const captureStream = capture();
    lines = captureStream.lines;
    configureLogger({ nodeEnv: 'development', files: false, consoleStream: captureStream.stream });
  });
  afterEach(() => { configureLogger({ silent: true, files: false }); });
  it('/loggerTest emite los seis niveles y responde sin simular un fallo HTTP', async () => {
    const response = await request(createApp({ loggerTestEnabled: true })).get('/loggerTest');
    expect(response.status).to.equal(200);
    const records = lines.filter(x => x.message === 'LOGGER_TEST');
    expect(records.map(x => x.level)).to.deep.equal(Object.keys(LOG_LEVELS));
    expect(records.every(x => x.simulated === true)).to.equal(true);
  });
  it('deshabilita el endpoint por defecto y en producción', async () => {
    const env = { PORT: '8080', NODE_ENV: 'production', MONGODB_URI: 'mongodb://localhost/demo', ENABLE_LOGGER_TEST: 'true' };
    expect(validateEnv(env).loggerTestEnabled).to.equal(false);
    expect((await request(createApp(validateEnv(env))).get('/loggerTest')).status).to.equal(404);
    expect((await request(createApp()).get('/loggerTest')).status).to.equal(404);
    expect(() => validateEnv({ ...env, ENABLE_LOGGER_TEST: 'yes' })).to.throw('ENABLE_LOGGER_TEST');
  });
  it('registra 4xx como warning y HTTP sin query, headers ni datos del body', async () => {
    await request(createApp()).post('/api/users?token=secret-query')
      .set('Authorization', 'Bearer secret-header').send({ name: 'secret-body', email: 'invalid' });
    const error = lines.find(x => x.message === 'API_ERROR');
    expect(error.level).to.equal('warning');
    expect(error.code).to.equal('INVALID_EMAIL');
    const http = lines.find(x => x.message === 'HTTP_REQUEST');
    expect(http.statusCode).to.equal(400);
    expect(http.route).to.equal('/api/users');
    expect(http.durationMs).to.be.at.least(0);
    expect(JSON.stringify(lines)).not.to.include('secret');
  });
  it('error inesperado: nivel error, respuesta M3 intacta y causa privada omitida', async () => {
    const app = express();
    app.get('/failure', async () => { throw new Error('mongodb://secret:password@host'); });
    app.use(errorHandler);
    const response = await request(app).get('/failure');
    expect(response.status).to.equal(500);
    expect(response.body.error).to.equal('INTERNAL_ERROR');
    expect(lines.find(x => x.message === 'API_ERROR').level).to.equal('error');
    expect(JSON.stringify(lines)).not.to.include('password');
  });
  it('registra generación de mocks con cantidad y lote, sin personas', async () => {
    const response = await request(createApp({ mocksEnabled: true })).get('/api/mocks/dataset?qty=2');
    const record = lines.find(x => x.message === 'MOCK_PREVIEW_CREATED');
    expect(record).to.include({ level: 'debug', qty: 2, batchId: response.body.data.batchId });
    expect(JSON.stringify(lines)).not.to.include(response.body.data.users[0].email);
  });
});
```

## tests/mocks.integration.mongodb.js

```javascript
import { expectDocumentedResponse } from './helpers/openapi.js';
import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';
import { USER_ROLES } from '../src/constants/index.js';
const app = createApp({ mocksEnabled: true });
const batches = [];
describe('M2: mocks con MongoDB real', () => {
  after(async () => {
    if (batches.length) {
      const filter = { mockBatchId: { $in: batches } };
      await Delivery.deleteMany(filter);
      await Order.deleteMany(filter);
      await User.deleteMany(filter);
    }
  });
  it('la vista previa no persiste sus documentos', async () => {
    const response = await request(app).get('/api/mocks/dataset?qty=2');
    expect(response.status).to.equal(200);
    await expectDocumentedResponse('/api/mocks/dataset', 'get', response);
    const filter = { mockBatchId: response.body.data.batchId };
    expect(await User.countDocuments(filter)).to.equal(0);
    expect(await Order.countDocuments(filter)).to.equal(0);
    expect(await Delivery.countDocuments(filter)).to.equal(0);
  });
  it('dos cargas conservan el lote anterior y persisten referencias válidas', async () => {
    for (let run = 0; run < 2; run++) {
      const response = await request(app).post('/api/mocks/seed').send({ qty: 2 });
      if (response.body.data?.batchId) batches.push(response.body.data.batchId);
      expect(response.status).to.equal(201);
      await expectDocumentedResponse('/api/mocks/seed', 'post', response);
      expect(response.body.data.inserted.total).to.equal(8);
      const filter = { mockBatchId: response.body.data.batchId };
      expect(await User.countDocuments(filter)).to.equal(4);
      expect(await Order.countDocuments(filter)).to.equal(2);
      const deliveries = await Delivery.find(filter).populate('orderId').populate('driverId').lean();
      expect(deliveries).to.have.length(2);
      for (const delivery of deliveries) {
        expect(delivery.orderId.status).to.equal(delivery.status);
        expect(delivery.orderId.priority).to.equal(delivery.priority);
        const user = await User.findById(delivery.orderId.userId).lean();
        expect(user.role).to.equal(USER_ROLES.USER);
        if (delivery.driverId) expect(delivery.driverId.role).to.equal(USER_ROLES.DRIVER);
      }
    }
    expect(batches[0]).not.to.equal(batches[1]);
    expect(await User.countDocuments({ mockBatchId: batches[0] })).to.equal(4);
  });
});
```
