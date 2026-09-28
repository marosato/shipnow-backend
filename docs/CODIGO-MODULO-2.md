# Código — Módulo 2

Archivos nuevos y modificados respecto del commit 8a337c6. El resto de M1 se conserva.

## .env.example

```text
PORT=8080
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/shipnow_development

# Activar solo para desarrollo local. En producción se ignora.
ENABLE_MOCKS=true

```

## package.json

```json
{
  "name": "shipnow-backend",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "description": "Backend III - Módulos 1 y 2",
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
  app.use((req, res, next) => next(new AppError(404, 'Ruta no encontrada.')));
  app.use(errorHandler);
  return app;
}

export default createApp();

```

## src/config/env.config.js

```javascript
import dotenv from 'dotenv';

// Único módulo autorizado para leer process.env.
export function validateEnv(source) {
  for (const key of ['PORT', 'NODE_ENV', 'MONGODB_URI']) {
    if (typeof source[key] !== 'string' || !source[key].trim()) {
      throw new Error(`Configuración inválida: falta ${key}.`);
    }
  }
  const portText = source.PORT.trim();
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configuración inválida: PORT debe ser un entero entre 1 y 65535.');
  }
  const nodeEnv = source.NODE_ENV.trim();
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('Configuración inválida: NODE_ENV debe ser development, test o production.');
  }
  const mongodbUri = source.MONGODB_URI.trim();
  if (!/^mongodb(?:\+srv)?:\/\/[^\s]+$/.test(mongodbUri)) {
    throw new Error('Configuración inválida: MONGODB_URI debe ser una URI MongoDB.');
  }
  const flag = source.ENABLE_MOCKS ?? 'false';
  if (!['true', 'false'].includes(flag)) {
    throw new Error('Configuración inválida: ENABLE_MOCKS debe ser true o false.');
  }
  return Object.freeze({ port, nodeEnv, mongodbUri,
    mocksEnabled: flag === 'true' && nodeEnv !== 'production' });
}

export function loadConfig() {
  dotenv.config({ quiet: true });
  return validateEnv(process.env);
}

```

## src/constants/index.js

```javascript
export const USER_ROLES = Object.freeze({ ADMIN: 'admin', USER: 'user', DRIVER: 'driver' });
export const PRODUCT_STATUS = Object.freeze({ AVAILABLE: 'available', OUT_OF_STOCK: 'out_of_stock' });

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending', ASSIGNED: 'assigned', IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered', CANCELLED: 'cancelled',
});
export const DELIVERY_PRIORITY = Object.freeze({ LOW: 'low', NORMAL: 'normal', HIGH: 'high' });
export const MOCK_LIMITS = Object.freeze({ DEFAULT_QTY: 10, MAX_QTY: 100 });

```

## src/controllers/mock.controller.js

```javascript
import { mockService } from '../services/mock.service.js';

export async function dataset(req, res, next) {
  try { res.status(200).json({ status: 'success', data: mockService.preview(req.query) }); }
  catch (error) { next(error); }
}

export async function users(req, res, next) {
  try { res.status(200).json({ status: 'success', data: mockService.preview(req.query).users }); }
  catch (error) { next(error); }
}

export async function seed(req, res, next) {
  try { res.status(201).json({ status: 'success', data: await mockService.seed(req.body, req.query) }); }
  catch (error) { next(error); }
}

```

## src/models/delivery.model.js

```javascript
import { Schema, model } from 'mongoose';
import { ORDER_STATUS, DELIVERY_PRIORITY } from '../constants/index.js';

const deliverySchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, required: true, enum: Object.values(ORDER_STATUS) },
  priority: { type: String, required: true, enum: Object.values(DELIVERY_PRIORITY) },
  mockBatchId: { type: String, index: true },
}, { timestamps: true, versionKey: false });

export default model('Delivery', deliverySchema);

```

## src/models/order.model.js

```javascript
import { Schema, model } from 'mongoose';
import { ORDER_STATUS, DELIVERY_PRIORITY } from '../constants/index.js';

const itemSchema = new Schema({
  name: { type: String, required: true, maxlength: 120 },
  quantity: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  address: { type: String, required: true, maxlength: 250 },
  items: { type: [itemSchema], required: true, validate: value => value.length > 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, required: true, enum: Object.values(ORDER_STATUS) },
  priority: { type: String, required: true, enum: Object.values(DELIVERY_PRIORITY) },
  mockBatchId: { type: String, index: true },
}, { timestamps: true, versionKey: false });

export default model('Order', orderSchema);

```

## src/models/user.model.js

```javascript
import { Schema, model } from 'mongoose';
import { USER_ROLES } from '../constants/index.js';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  mockBatchId: { type: String, index: true },
  role: { type: String, required: true, enum: Object.values(USER_ROLES) },
}, { timestamps: true, versionKey: false });

export default model('User', userSchema);

```

## src/repositories/delivery.repository.js

```javascript
import Delivery from '../models/delivery.model.js';

export async function initialize() { await Delivery.init(); }

export function insertMany(documents) {
  return Delivery.insertMany(documents, { ordered: true });
}

export function deleteMockBatch(batchId) {
  // Solo datos identificados con el UUID de este lote; nunca borra una colección.
  return Delivery.deleteMany({ mockBatchId: batchId }).exec();
}

```

## src/repositories/order.repository.js

```javascript
import Order from '../models/order.model.js';

export async function initialize() { await Order.init(); }

export function insertMany(documents) {
  return Order.insertMany(documents, { ordered: true });
}

export function deleteMockBatch(batchId) {
  // Solo datos identificados con el UUID de este lote; nunca borra una colección.
  return Order.deleteMany({ mockBatchId: batchId }).exec();
}

```

## src/repositories/user.repository.js

```javascript
import User from '../models/user.model.js';

const fields = '_id name email role createdAt updatedAt';

export function findAll({ limit, skip }) {
  return User.find({}).select(fields).sort({ _id: 1 }).skip(skip).limit(limit).lean().exec();
}

export function findById(id) {
  return User.findById(id).select(fields).lean().exec();
}

export async function create(data) {
  const document = await User.create(data);
  return findById(document._id);
}

// Asegura que los índices declarados estén listos antes de aceptar peticiones.
export async function initialize() {
  await User.init();
}

export function insertMany(documents) {
  return User.insertMany(documents, { ordered: true });
}

export function deleteMockBatch(batchId) {
  // Solo datos identificados con el UUID de este lote; nunca borra una colección.
  return User.deleteMany({ mockBatchId: batchId }).exec();
}

```

## src/routes/mocks.router.js

```javascript
import { Router } from 'express';
import * as controller from '../controllers/mock.controller.js';

const router = Router();
router.get('/users', controller.users);
router.get('/dataset', controller.dataset);
router.post('/seed', controller.seed);
export default router;

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
    console.info(`ShipNow M2 disponible en http://127.0.0.1:${config.port}`);
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

## src/services/mock.generator.js

```javascript
import { randomBytes, randomUUID } from 'node:crypto';
import { Faker, es, en } from '@faker-js/faker';
import { USER_ROLES, ORDER_STATUS, DELIVERY_PRIORITY } from '../constants/index.js';

// Datos compatibles con MongoDB sin importar Mongoose ni escribir en persistencia.
const newId = () => randomBytes(12).toString('hex');

export function generateDataset(qty) {
  const faker = new Faker({ locale: [es, en] });
  const batchId = randomUUID();
  const person = (role, index) => ({
    _id: newId(), name: faker.person.fullName().slice(0, 120),
    email: `${role}.${index}.${batchId}@example.com`, role, mockBatchId: batchId,
  });
  const users = Array.from({ length: qty }, (_, i) => person(USER_ROLES.USER, i));
  const drivers = Array.from({ length: qty }, (_, i) => person(USER_ROLES.DRIVER, i));
  const orders = users.map(user => {
    const items = [{ name: faker.commerce.productName().slice(0, 120),
      quantity: faker.number.int({ min: 1, max: 5 }),
      unitPrice: faker.number.int({ min: 100, max: 10000 }) }];
    return {
      _id: newId(), userId: user._id, address: faker.location.streetAddress().slice(0, 250),
      items, total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      status: faker.helpers.arrayElement(Object.values(ORDER_STATUS)),
      priority: faker.helpers.arrayElement(Object.values(DELIVERY_PRIORITY)),
      mockBatchId: batchId,
    };
  });
  const deliveries = orders.map((order, index) => ({
    _id: newId(), orderId: order._id,
    driverId: [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED].includes(order.status)
      ? null : drivers[index]._id,
    status: order.status, priority: order.priority, mockBatchId: batchId,
  }));
  return { batchId, users, drivers, orders, deliveries };
}

```

## src/services/mock.service.js

```javascript
import * as userRepository from '../repositories/user.repository.js';
import * as orderRepository from '../repositories/order.repository.js';
import * as deliveryRepository from '../repositories/delivery.repository.js';
import { generateDataset } from './mock.generator.js';
import { MOCK_LIMITS } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { validateBody } from './validation.js';

export function parseQueryQty(query = {}) {
  if (Object.keys(query).some(key => key !== 'qty')) {
    throw new AppError(400, 'Solo se admite el parámetro qty.');
  }
  if (query.qty === undefined) return MOCK_LIMITS.DEFAULT_QTY;
  if (typeof query.qty !== 'string' || !/^[1-9]\d*$/.test(query.qty)) {
    throw new AppError(400, 'qty debe ser un entero positivo.');
  }
  return validateQty(Number(query.qty));
}

function validateQty(qty) {
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > MOCK_LIMITS.MAX_QTY) {
    throw new AppError(400, `qty debe ser un entero entre 1 y ${MOCK_LIMITS.MAX_QTY}.`);
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
      if (Object.keys(query).length) throw new AppError(400, 'En seed, qty se envía en el body JSON.');
      validateBody(body, ['qty']);
      const dataset = generateDataset(validateQty(body.qty));
      const { batchId, users, drivers, orders, deliveries } = dataset;
      try {
        await repositories.users.insertMany([...users, ...drivers]);
        await repositories.orders.insertMany(orders);
        await repositories.deliveries.insertMany(deliveries);
      } catch {
        // Compensación en orden inverso. Si falla, no eliminamos sus padres.
        // No es una transacción: una caída de proceso requiere revisión del lote.
        try {
          await repositories.deliveries.deleteMockBatch(batchId);
          await repositories.orders.deleteMockBatch(batchId);
          await repositories.users.deleteMockBatch(batchId);
        } catch {
          throw new AppError(500, `No se completó la carga ni la limpieza del lote ${batchId}. Requiere revisión.`);
        }
        throw new AppError(500, `Falló la carga del lote ${batchId}; sus registros fueron retirados.`);
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

## tests/mocks.integration.mongodb.js

```javascript
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
    expect(error?.message).to.include('Requiere revisión').and.include(batches[0]);
    expect(calls).to.deep.equal(['insert:users', 'insert:orders', 'delete:deliveries']);
  });
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
    });
  }
});

```

## tests/integration.setup.js

```javascript
import { loadConfig } from '../src/config/env.config.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.config.js';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
import Order from '../src/models/order.model.js';
import Delivery from '../src/models/delivery.model.js';

// Una conexión para toda la ejecución serial de integración.
// Esperar todos los modelos evita cerrar con inicializaciones pendientes.
export const mochaHooks = {
  async beforeAll() {
    const config = loadConfig();
    const database = new URL(config.mongodbUri).pathname.slice(1);
    if (config.nodeEnv !== 'test' || !database.endsWith('_test')) {
      throw new Error('Se requiere NODE_ENV=test y una base terminada en _test.');
    }
    await connectDatabase(config.mongodbUri);
    const results = await Promise.allSettled([
      User.init(), Product.init(), Order.init(), Delivery.init(),
    ]);
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
  },
  async afterAll() {
    await disconnectDatabase();
  },
};

```
