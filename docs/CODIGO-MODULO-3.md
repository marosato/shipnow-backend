# Código archivo por archivo — Módulo 3

Cambios respecto de b22747c. Los archivos no listados conservan M2.

## package.json

```json
{
  "name": "shipnow-backend",
  "version": "0.3.0",
  "private": true,
  "type": "module",
  "description": "Backend III - Módulos 1 a 3",
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
    "mongoose": "9.10.1"
  },
  "devDependencies": {
    "chai": "6.2.2",
    "mocha": "12.0.1",
    "supertest": "7.2.2"
  }
}

```

## src/app.js

```javascript
import { ERRORS } from './errors/error-catalog.js';
import express from 'express';
import usersRouter from './routes/users.router.js';
import productsRouter from './routes/products.router.js';
import mocksRouter from './routes/mocks.router.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';

export function createApp({ mocksEnabled = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/users', usersRouter);
  app.use('/api/products', productsRouter);
  if (mocksEnabled) app.use('/api/mocks', mocksRouter);
  app.use((req, res, next) => next(new AppError(ERRORS.ROUTE_NOT_FOUND)));
  app.use(errorHandler);
  return app;
}

export default createApp();

```

## src/errors/app-error.js

```javascript
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

```

## src/errors/error-catalog.js

```javascript
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

```

## src/middlewares/error-handler.js

```javascript
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

```

## src/server.js

```javascript
import { createApp } from './app.js';
import { initialize as initializeOrders } from './repositories/order.repository.js';
import { initialize as initializeDeliveries } from './repositories/delivery.repository.js';
import { loadConfig } from './config/env.config.js';
import { connectDatabase, disconnectDatabase } from './config/db.config.js';
import { initialize as initializeUsers } from './repositories/user.repository.js';
import { initialize as initializeProducts } from './repositories/product.repository.js';

async function start() {
  const config = loadConfig();
  try {
    await connectDatabase(config.mongodbUri);
    await Promise.all([initializeUsers(), initializeProducts(), initializeOrders(), initializeDeliveries()]);
  } catch {
    throw new Error('No se pudo preparar MongoDB. Verifique conexión, permisos e índices.');
  }
  const app = createApp(config);
  const server = app.listen(config.port, '127.0.0.1', () => {
    console.info(`ShipNow M3 disponible en http://127.0.0.1:${config.port}`);
  });
  server.on('error', async () => {
    console.error('No se pudo abrir el puerto HTTP configurado.');
    await disconnectDatabase();
    process.exitCode = 1;
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      try { await disconnectDatabase(); }
      finally { clearTimeout(timeout); }
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(async (error) => {
  console.error(error.message);
  await disconnectDatabase();
  process.exitCode = 1;
});

```

## src/services/mock.service.js

```javascript
import { ERRORS } from '../errors/error-catalog.js';
import * as userRepository from '../repositories/user.repository.js';
import * as orderRepository from '../repositories/order.repository.js';
import * as deliveryRepository from '../repositories/delivery.repository.js';
import { generateDataset } from './mock.generator.js';
import { MOCK_LIMITS } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { validateBody } from './validation.js';

export function parseQueryQty(query = {}) {
  if (Object.keys(query).some(key => key !== 'qty')) {
    throw new AppError(ERRORS.INVALID_QUERY);
  }
  if (query.qty === undefined) return MOCK_LIMITS.DEFAULT_QTY;
  if (typeof query.qty !== 'string' || !/^[1-9]\d*$/.test(query.qty)) {
    throw new AppError(ERRORS.INVALID_MOCK_AMOUNT);
  }
  return validateQty(Number(query.qty));
}

function validateQty(qty) {
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > MOCK_LIMITS.MAX_QTY) {
    throw new AppError(ERRORS.INVALID_MOCK_AMOUNT);
  }
  return qty;
}

// Inyección simple para probar fallas de escritura sin una infraestructura adicional.
export function createMockService(repositories = {
  users: userRepository, orders: orderRepository, deliveries: deliveryRepository,
}) {
  return {
    preview(query) { return generateDataset(parseQueryQty(query)); },
    async seed(body, query = {}) {
      if (Object.keys(query).length) throw new AppError(ERRORS.INVALID_MOCK_INPUT);
      validateBody(body, ['qty']);
      const dataset = generateDataset(validateQty(body.qty));
      const { batchId, users, drivers, orders, deliveries } = dataset;
      try {
        await repositories.users.insertMany([...users, ...drivers]);
        await repositories.orders.insertMany(orders);
        await repositories.deliveries.insertMany(deliveries);
      } catch (loadError) {
        // Compensación en orden inverso. Si falla, no eliminamos sus padres.
        // No es una transacción: una caída de proceso requiere revisión del lote.
        try {
          await repositories.deliveries.deleteMockBatch(batchId);
          await repositories.orders.deleteMockBatch(batchId);
          await repositories.users.deleteMockBatch(batchId);
        } catch (cleanupError) {
          throw new AppError(ERRORS.MOCK_CLEANUP_FAILED, { cause: new AggregateError([loadError, cleanupError]), context: { batchId } });
        }
        throw new AppError(ERRORS.MOCK_LOAD_FAILED, { cause: loadError, context: { batchId } });
      }
      return { batchId, inserted: { users: users.length, drivers: drivers.length,
        orders: orders.length, deliveries: deliveries.length, total: users.length + drivers.length + orders.length + deliveries.length },
        ids: { users: users.map(x => x._id), drivers: drivers.map(x => x._id),
          orders: orders.map(x => x._id), deliveries: deliveries.map(x => x._id) } };
    },
  };
}

export const mockService = createMockService();

```

## src/services/product.service.js

```javascript
import { ERRORS } from '../errors/error-catalog.js';
import * as repository from '../repositories/product.repository.js';
import { PRODUCT_STATUS } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { pagination, requiredText, validateBody, validateId } from './validation.js';

export function list(query) {
  return repository.findAll(pagination(query));
}

export async function getById(id) {
  validateId(id);
  const product = await repository.findById(id);
  if (!product) throw new AppError(ERRORS.PRODUCT_NOT_FOUND);
  return product;
}

export function create(body) {
  validateBody(body, ['name', 'price', 'stock']);
  const name = requiredText(body.name, 'name', 120);
  if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
    throw new AppError(ERRORS.INVALID_PRICE);
  }
  if (!Number.isSafeInteger(body.stock) || body.stock < 0) {
    throw new AppError(ERRORS.INVALID_STOCK);
  }
  // Decisión de negocio: el cliente no puede imponer un estado incompatible con el stock.
  const status = body.stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;
  return repository.create({ name, price: body.price, stock: body.stock, status });
}

```

## src/services/user.service.js

```javascript
import { ERRORS } from '../errors/error-catalog.js';
import * as repository from '../repositories/user.repository.js';
import { USER_ROLES } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { pagination, requiredText, validateBody, validateId } from './validation.js';

export function list(query) {
  return repository.findAll(pagination(query));
}

export async function getById(id) {
  validateId(id);
  const user = await repository.findById(id);
  if (!user) throw new AppError(ERRORS.USER_NOT_FOUND);
  return user;
}

export function create(body) {
  validateBody(body, ['name', 'email']);
  const name = requiredText(body.name, 'name', 120);
  const email = requiredText(body.email, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(ERRORS.INVALID_EMAIL);
  }
  // No se acepta un rol elevado desde el body de una ruta sin autenticación.
  return repository.create({ name, email, role: USER_ROLES.USER });
}

```

## src/services/validation.js

```javascript
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

```

## tests/errors.test.js

```javascript
import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ERRORS } from '../src/errors/error-catalog.js';
import { AppError } from '../src/errors/app-error.js';
import { errorHandler } from '../src/middlewares/error-handler.js';
import { createMockService, mockService } from '../src/services/mock.service.js';

const app = createApp({ mocksEnabled: true });
function expectError(response, definition) {
  expect(response.status).to.equal(definition.statusCode);
  expect(response.body).to.deep.equal({ status: 'error', error: definition.code, message: definition.message });
}
describe('M3: contrato uniforme de errores', () => {
  it('congela el catálogo y exige definiciones registradas', () => {
    expect(Object.isFrozen(ERRORS)).to.equal(true);
    for (const [key, value] of Object.entries(ERRORS)) {
      expect(value.code).to.equal(key);
      expect(Object.isFrozen(value)).to.equal(true);
    }
    expect(() => new AppError({ code: 'inventado' })).to.throw(TypeError);
  });
  const cases = [
    ['get', '/missing', undefined, ERRORS.ROUTE_NOT_FOUND],
    ['get', '/api/users/not-an-id', undefined, ERRORS.INVALID_ID],
    ['get', '/api/products?page=-1', undefined, ERRORS.INVALID_PAGINATION],
    ['post', '/api/users', [], ERRORS.INVALID_BODY],
    ['post', '/api/users', { name: '', email: 'a@example.com' }, ERRORS.INVALID_TEXT],
    ['post', '/api/users', { name: 'Ana', email: 'invalid' }, ERRORS.INVALID_EMAIL],
    ['post', '/api/products', { name: 'Caja', price: -1, stock: 1 }, ERRORS.INVALID_PRICE],
    ['post', '/api/products', { name: 'Caja', price: 1, stock: -1 }, ERRORS.INVALID_STOCK],
    ['get', '/api/mocks/dataset?qty=-1', undefined, ERRORS.INVALID_MOCK_AMOUNT],
    ['get', '/api/mocks/users?qty=text', undefined, ERRORS.INVALID_MOCK_AMOUNT],
    ['post', '/api/mocks/seed', { qty: 101 }, ERRORS.INVALID_MOCK_AMOUNT],
    ['post', '/api/mocks/seed?qty=1', { qty: 1 }, ERRORS.INVALID_MOCK_INPUT],
  ];
  for (const [method, path, body, definition] of cases) {
    it(`${method.toUpperCase()} ${path}: ${definition.code}`, async () => {
      expectError(await request(app)[method](path).send(body), definition);
    });
  }
  it('JSON malformado y cuerpo excesivo tienen el mismo contrato', async () => {
    expectError(await request(app).post('/api/users').set('Content-Type', 'application/json').send('{'), ERRORS.INVALID_JSON);
    expectError(await request(app).post('/api/users').send({ name: 'x'.repeat(110000) }), ERRORS.PAYLOAD_TOO_LARGE);
  });
  for (const [error, definition] of [
    [Object.assign(new Error('mongodb://secret'), { code: 11000 }), ERRORS.DUPLICATE_RESOURCE],
    [Object.assign(new Error('private data'), { name: 'ValidationError' }), ERRORS.INVALID_DATA],
    [Object.assign(new Error('private data'), { name: 'CastError' }), ERRORS.INVALID_DATA],
    [Object.assign(new Error('password=secret'), { statusCode: 400 }), ERRORS.INTERNAL_ERROR],
    [null, ERRORS.INTERNAL_ERROR],
  ]) {
    it(`normaliza ${error?.name ?? 'null'} como ${definition.code} sin filtrar detalles`, async () => {
      const fixture = express();
      fixture.get('/failure', async (req, res, next) => {
        if (error === null) return errorHandler(null, req, res, next);
        throw error;
      });
      fixture.use(errorHandler);
      expectError(await request(fixture).get('/failure'), definition);
    });
  }
  it('delega si la respuesta ya comenzó', () => {
    const error = new Error('test');
    let forwarded;
    errorHandler(error, {}, { headersSent: true }, caught => { forwarded = caught; });
    expect(forwarded).to.equal(error);
  });
  for (const cleanupFails of [false, true]) {
    it(`la falla de seed llega por Controller al middleware (limpieza falla=${cleanupFails})`, async () => {
      const failure = new Error('mongodb://private:secret@host');
      const repository = {
        async insertMany() { throw failure; },
        async deleteMockBatch() { if (cleanupFails) throw new Error('private cleanup'); },
      };
      const failing = createMockService({ users: repository, orders: repository, deliveries: repository });
      const original = mockService.seed;
      mockService.seed = failing.seed;
      try {
        expectError(await request(app).post('/api/mocks/seed').send({ qty: 1 }),
          cleanupFails ? ERRORS.MOCK_CLEANUP_FAILED : ERRORS.MOCK_LOAD_FAILED);
      } finally { mockService.seed = original; }
    });
  }
});

```

## tests/integration.mongodb.js

```javascript
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
    expect(created.body.data).to.include({ name: 'Ana', email: email.toLowerCase(), role: USER_ROLES.USER });
    const found = await request(app).get(`/api/users/${created.body.data._id}`);
    expect(found.status).to.equal(200);
    expect(found.body.data.email).to.equal(email.toLowerCase());
    const duplicate = await request(app).post('/api/users').send({ name: 'Ana', email });
    expect(duplicate.status).to.equal(409);
    expect(duplicate.body.status).to.equal('error');
    expect(duplicate.body.error).to.equal('DUPLICATE_RESOURCE');
  });
  for (const [stock, status] of [[3, PRODUCT_STATUS.AVAILABLE], [0, PRODUCT_STATUS.OUT_OF_STOCK]]) {
    it(`persiste producto con stock ${stock} y estado derivado`, async () => {
      const created = await request(app).post('/api/products').send({ name: 'Caja', price: 12.5, stock });
      if (created.body.data?._id) products.push(created.body.data._id);
      expect(created.status).to.equal(201);
      expect(created.body.data).to.include({ name: 'Caja', price: 12.5, stock, status });
      const found = await request(app).get(`/api/products/${created.body.data._id}`);
      expect(found.status).to.equal(200);
      expect(found.body.data.status).to.equal(status);
      expect(await Product.exists({ _id: created.body.data._id })).not.to.equal(null);
    });
  }
  for (const resource of ['users', 'products']) {
    it(`limita listado de ${resource}`, async () => {
      const response = await request(app).get(`/api/${resource}?limit=1`);
      expect(response.status).to.equal(200);
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.at.most(1);
    });
    it(`devuelve 404 para ${resource} inexistente`, async () => {
      const response = await request(app).get(`/api/${resource}/000000000000000000000000`);
      expect(response.status).to.equal(404);
      expect(response.body.status).to.equal('error');
      expect(response.body.error).to.equal(resource === 'users' ? 'USER_NOT_FOUND' : 'PRODUCT_NOT_FOUND');
    });
  }
});

```

## tests/mocks.test.js

```javascript
import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { validateEnv } from '../src/config/env.config.js';
import { generateDataset } from '../src/services/mock.generator.js';
import { createMockService } from '../src/services/mock.service.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';
import { USER_ROLES, ORDER_STATUS, DELIVERY_PRIORITY } from '../src/constants/index.js';

const app = createApp({ mocksEnabled: true });
describe('M2: generación y contrato HTTP sin MongoDB', () => {
  it('genera documentos válidos y relaciones coherentes para el máximo permitido', async () => {
    const data = generateDataset(100);
    const all = [...data.users, ...data.drivers, ...data.orders, ...data.deliveries];
    expect(new Set(all.map(x => x._id)).size).to.equal(400);
    for (const user of data.users) expect(user.role).to.equal(USER_ROLES.USER);
    for (const driver of data.drivers) expect(driver.role).to.equal(USER_ROLES.DRIVER);
    for (let i = 0; i < 100; i++) {
      const order = data.orders[i], delivery = data.deliveries[i];
      expect(order.userId).to.equal(data.users[i]._id);
      expect(order.total).to.equal(order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
      expect(Object.values(ORDER_STATUS)).to.include(order.status);
      expect(Object.values(DELIVERY_PRIORITY)).to.include(order.priority);
      expect(delivery.orderId).to.equal(order._id);
      expect(delivery.status).to.equal(order.status);
      expect(delivery.priority).to.equal(order.priority);
      expect(delivery.driverId).to.equal([ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED].includes(order.status) ? null : data.drivers[i]._id);
    }
    await Promise.all([...data.users, ...data.drivers].map(x => new User(x).validate()));
    await Promise.all(data.orders.map(x => new Order(x).validate()));
    await Promise.all(data.deliveries.map(x => new Delivery(x).validate()));
  });
  it('GET dataset y users funcionan sin conexión a MongoDB', async () => {
    const response = await request(app).get('/api/mocks/dataset?qty=2');
    expect(response.status).to.equal(200);
    expect(response.body.data.orders).to.have.length(2);
    const users = await request(app).get('/api/mocks/users');
    expect(users.status).to.equal(200);
    expect(users.body.data).to.have.length(10);
  });
  for (const query of ['qty=0', 'qty=101', 'qty=-1', 'qty=1.5', 'qty=abc', 'qty=1&qty=2', 'qty[$gt]=1', 'unknown=1']) {
    it(`rechaza consulta ${query}`, async () => {
      expect((await request(app).get(`/api/mocks/dataset?${query}`)).status).to.equal(400);
    });
  }
  for (const body of [{}, { qty: '2' }, { qty: 0 }, { qty: 101 }, { qty: 1.5 }, { qty: 2, role: 'admin' }, []]) {
    it(`rechaza seed inválido ${JSON.stringify(body)}`, async () => {
      expect((await request(app).post('/api/mocks/seed').send(body)).status).to.equal(400);
    });
  }
  it('seed exige qty en JSON, no en query', async () => {
    expect((await request(app).post('/api/mocks/seed?qty=2').send({ qty: 2 })).status).to.equal(400);
  });
  it('oculta las rutas por defecto y en producción aunque se solicite habilitarlas', async () => {
    const env = { PORT: '8080', NODE_ENV: 'production', MONGODB_URI: 'mongodb://localhost/test', ENABLE_MOCKS: 'true' };
    expect(validateEnv(env).mocksEnabled).to.equal(false);
    expect((await request(createApp(validateEnv(env))).get('/api/mocks/users')).status).to.equal(404);
    expect((await request(createApp()).post('/api/mocks/seed').send({ qty: 1 })).status).to.equal(404);
    expect(() => validateEnv({ ...env, ENABLE_MOCKS: 'yes' })).to.throw('ENABLE_MOCKS');
  });
});

describe('M2: orquestación y compensación de fallos', () => {
  function setup(failAt, failCleanup = false) {
    const calls = [], batches = [];
    const repositories = Object.fromEntries(['users', 'orders', 'deliveries'].map(name => [name, {
      async insertMany(docs) { calls.push(`insert:${name}`); batches.push(...docs.map(x => x.mockBatchId)); if (name === failAt) throw new Error('simulado'); },
      async deleteMockBatch(id) { calls.push(`delete:${name}`); batches.push(id); if (failCleanup) throw new Error('limpieza'); },
    }]));
    return { service: createMockService(repositories), calls, batches };
  }
  it('inserta padres antes que referencias y cuenta documentos', async () => {
    const { service, calls } = setup();
    const result = await service.seed({ qty: 2 });
    expect(result.inserted).to.deep.equal({ users: 2, drivers: 2, orders: 2, deliveries: 2, total: 8 });
    expect(calls).to.deep.equal(['insert:users', 'insert:orders', 'insert:deliveries']);
  });
  for (const failAt of ['users', 'orders', 'deliveries']) {
    it(`compensa un fallo en ${failAt} únicamente por su lote`, async () => {
      const { service, calls, batches } = setup(failAt);
      let error;
      try { await service.seed({ qty: 1 }); } catch (caught) { error = caught; }
      expect(error?.statusCode).to.equal(500);
      expect(error.message).to.include('retirados');
      expect(calls.slice(-3)).to.deep.equal(['delete:deliveries', 'delete:orders', 'delete:users']);
      expect(new Set(batches).size).to.equal(1);
    });
  }
  it('si falla la compensación informa lote y no elimina sus padres', async () => {
    const { service, calls, batches } = setup('orders', true);
    let error;
    try { await service.seed({ qty: 1 }); } catch (caught) { error = caught; }
    expect(error?.message).to.include('Requiere revisión');
    expect(error.context.batchId).to.equal(batches[0]);
    expect(error.code).to.equal('MOCK_CLEANUP_FAILED');
    expect(error.cause.errors).to.have.length(2);
    expect(calls).to.deep.equal(['insert:users', 'insert:orders', 'delete:deliveries']);
  });
});

```
