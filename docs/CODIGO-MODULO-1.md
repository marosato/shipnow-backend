# Código completo — Módulo 1

Versión con Mocha 12.0.1. Los bloques corresponden a los archivos del paquete.

## package.json

```json
{
  "name": "shipnow-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Backend III - Módulo 1",
  "engines": {
    "node": ">=24 <25"
  },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "mocha --timeout 10000 \"tests/**/*.test.js\"",
    "test:integration": "mocha --timeout 15000 tests/integration.mongodb.js"
  },
  "dependencies": {
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


## .env.example

```text
PORT=8080
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/shipnow_development
```


## .gitignore

```text
node_modules/
.env
.env.*
!.env.example
logs/
uploads/
coverage/
*.log
.DS_Store
```


## .nvmrc

```text
24
```


## src/app.js

```javascript
import express from 'express';
import usersRouter from './routes/users.router.js';
import productsRouter from './routes/products.router.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use((req, res, next) => next(new AppError(404, 'Ruta no encontrada.')));
app.use(errorHandler);
export default app;
```


## src/config/db.config.js

```javascript
import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, bufferCommands: false });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
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
  return Object.freeze({ port, nodeEnv, mongodbUri });
}

export function loadConfig() {
  dotenv.config({ quiet: true });
  return validateEnv(process.env);
}
```


## src/constants/index.js

```javascript
export const USER_ROLES = Object.freeze({ ADMIN: 'admin', USER: 'user' });
export const PRODUCT_STATUS = Object.freeze({ AVAILABLE: 'available', OUT_OF_STOCK: 'out_of_stock' });
```


## src/controllers/product.controller.js

```javascript
import * as service from '../services/product.service.js';

export async function list(req, res, next) {
  try { res.status(200).json({ status: 'success', data: await service.list(req.query) }); }
  catch (error) { next(error); }
}

export async function getById(req, res, next) {
  try { res.status(200).json({ status: 'success', data: await service.getById(req.params.id) }); }
  catch (error) { next(error); }
}

export async function create(req, res, next) {
  try { res.status(201).json({ status: 'success', data: await service.create(req.body) }); }
  catch (error) { next(error); }
}
```


## src/controllers/user.controller.js

```javascript
import * as service from '../services/user.service.js';

export async function list(req, res, next) {
  try { res.status(200).json({ status: 'success', data: await service.list(req.query) }); }
  catch (error) { next(error); }
}

export async function getById(req, res, next) {
  try { res.status(200).json({ status: 'success', data: await service.getById(req.params.id) }); }
  catch (error) { next(error); }
}

export async function create(req, res, next) {
  try { res.status(201).json({ status: 'success', data: await service.create(req.body) }); }
  catch (error) { next(error); }
}
```


## src/errors/app-error.js

```javascript
// Soporte mínimo de M1. El catálogo de errores se desarrolla en M3.
export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}
```


## src/middlewares/error-handler.js

```javascript
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
```


## src/models/product.model.js

```javascript
import { Schema, model } from 'mongoose';
import { PRODUCT_STATUS } from '../constants/index.js';

const productSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  status: { type: String, required: true, enum: Object.values(PRODUCT_STATUS) },
}, { timestamps: true, versionKey: false });

export default model('Product', productSchema);
```


## src/models/user.model.js

```javascript
import { Schema, model } from 'mongoose';
import { USER_ROLES } from '../constants/index.js';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  role: { type: String, required: true, enum: Object.values(USER_ROLES) },
}, { timestamps: true, versionKey: false });

export default model('User', userSchema);
```


## src/repositories/product.repository.js

```javascript
import Product from '../models/product.model.js';

const fields = '_id name price stock status createdAt updatedAt';

export function findAll({ limit, skip }) {
  return Product.find({}).select(fields).sort({ _id: 1 }).skip(skip).limit(limit).lean().exec();
}

export function findById(id) {
  return Product.findById(id).select(fields).lean().exec();
}

export async function create(data) {
  const document = await Product.create(data);
  return findById(document._id);
}

// Asegura que los índices declarados estén listos antes de aceptar peticiones.
export async function initialize() {
  await Product.init();
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
```


## src/routes/products.router.js

```javascript
import { Router } from 'express';
import * as controller from '../controllers/product.controller.js';

const router = Router();
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
export default router;
```


## src/routes/users.router.js

```javascript
import { Router } from 'express';
import * as controller from '../controllers/user.controller.js';

const router = Router();
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
export default router;
```


## src/server.js

```javascript
import app from './app.js';
import { loadConfig } from './config/env.config.js';
import { connectDatabase, disconnectDatabase } from './config/db.config.js';
import { initialize as initializeUsers } from './repositories/user.repository.js';
import { initialize as initializeProducts } from './repositories/product.repository.js';

async function start() {
  const config = loadConfig();
  try {
    await connectDatabase(config.mongodbUri);
    await Promise.all([initializeUsers(), initializeProducts()]);
  } catch {
    throw new Error('No se pudo preparar MongoDB. Verifique conexión, permisos e índices.');
  }
  const server = app.listen(config.port, '127.0.0.1', () => {
    console.info(`ShipNow M1 disponible en http://127.0.0.1:${config.port}`);
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


## src/services/product.service.js

```javascript
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
  if (!product) throw new AppError(404, 'Producto no encontrado.');
  return product;
}

export function create(body) {
  validateBody(body, ['name', 'price', 'stock']);
  const name = requiredText(body.name, 'name', 120);
  if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
    throw new AppError(400, 'price debe ser un número finito no negativo.');
  }
  if (!Number.isSafeInteger(body.stock) || body.stock < 0) {
    throw new AppError(400, 'stock debe ser un entero no negativo.');
  }
  // Decisión de negocio: el cliente no puede imponer un estado incompatible con el stock.
  const status = body.stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;
  return repository.create({ name, price: body.price, stock: body.stock, status });
}
```


## src/services/user.service.js

```javascript
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
  if (!user) throw new AppError(404, 'Usuario no encontrado.');
  return user;
}

export function create(body) {
  validateBody(body, ['name', 'email']);
  const name = requiredText(body.name, 'name', 120);
  const email = requiredText(body.email, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, 'email tiene un formato inválido.');
  }
  // No se acepta un rol elevado desde el body de una ruta sin autenticación.
  return repository.create({ name, email, role: USER_ROLES.USER });
}
```


## src/services/validation.js

```javascript
import { AppError } from '../errors/app-error.js';

export function validateBody(body, allowedFields) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Se requiere un objeto JSON.');
  }
  if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
    throw new AppError(400, 'El body contiene campos no permitidos.');
  }
}

export function requiredText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AppError(400, `${label} es obligatorio y admite hasta ${maxLength} caracteres.`);
  }
  return value.trim();
}

export function validateId(id) {
  if (typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new AppError(400, 'El identificador debe contener 24 caracteres hexadecimales.');
  }
}

export function pagination(query = {}) {
  if (Object.keys(query).some((key) => !['limit', 'page'].includes(key))) {
    throw new AppError(400, 'Parámetro de consulta no permitido.');
  }
  const parse = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new AppError(400, 'page y limit deben ser enteros positivos.');
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > max) {
      throw new AppError(400, 'page o limit fuera del rango permitido.');
    }
    return number;
  };
  const limit = parse(query.limit, 20, 100);
  const page = parse(query.page, 1, 1000000);
  return { limit, skip: (page - 1) * limit };
}
```


## tests/base.test.js

```javascript
import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { validateEnv } from '../src/config/env.config.js';
import { USER_ROLES, PRODUCT_STATUS } from '../src/constants/index.js';

const valid = { PORT: '8080', NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:27017/shipnow_test' };
describe('Configuración y frontera HTTP sin base de datos', () => {
  it('valida y congela la configuración', () => {
    const config = validateEnv(valid);
    expect(config.port).to.equal(8080);
    expect(Object.isFrozen(config)).to.equal(true);
  });
  for (const key of Object.keys(valid)) {
    it(`rechaza ausencia de ${key}`, () => {
      expect(() => validateEnv({ ...valid, [key]: '' })).to.throw(key);
    });
  }
  for (const port of ['0', '65536', '12.5', '1e3']) {
    it(`rechaza puerto ${port}`, () => expect(() => validateEnv({ ...valid, PORT: port })).to.throw('PORT'));
  }
  it('rechaza entorno y URI inválidos', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'invalid' })).to.throw('NODE_ENV');
    expect(() => validateEnv({ ...valid, MONGODB_URI: 'http://localhost' })).to.throw('MONGODB_URI');
  });
  it('congela constantes del dominio', () => {
    expect(Object.isFrozen(USER_ROLES)).to.equal(true);
    expect(Object.isFrozen(PRODUCT_STATUS)).to.equal(true);
  });
  const cases = [
    ['get', '/missing', undefined, 404],
    ['get', '/api/products/not-an-id', undefined, 400],
    ['get', '/api/users/not-an-id', undefined, 400],
    ['get', '/api/products?limit=101', undefined, 400],
    ['get', '/api/users?page=-1', undefined, 400],
    ['get', '/api/users?limit=1&limit=2', undefined, 400],
    ['post', '/api/products', { name: 'Caja', price: 5, stock: -1 }, 400],
    ['post', '/api/products', { name: 'Caja', price: '5', stock: 1 }, 400],
    ['post', '/api/products', { name: 'Caja', price: 5, stock: 0, status: PRODUCT_STATUS.AVAILABLE }, 400],
    ['post', '/api/users', { name: 'Ana', email: 'invalid' }, 400],
    ['post', '/api/users', { name: 'Ana', email: 'ana@example.com', role: USER_ROLES.ADMIN }, 400],
    ['post', '/api/users', [], 400],
  ];
  for (const [method, url, body, status] of cases) {
    it(`${method.toUpperCase()} ${url} rechaza ${JSON.stringify(body)}`, async () => {
      const response = await request(app)[method](url).send(body);
      expect(response.status).to.equal(status);
      expect(response.body.status).to.equal('error');
      expect(response.body.message).to.be.a('string').and.not.empty;
      expect(response.body).not.to.have.property('stack');
    });
  }
  it('controla JSON mal formado', async () => {
    const response = await request(app).post('/api/users').set('Content-Type', 'application/json').send('{');
    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal('JSON inválido.');
  });
});
```


## tests/integration.mongodb.js

```javascript
import { expect } from 'chai';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../src/app.js';
import { loadConfig } from '../src/config/env.config.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.config.js';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
import { USER_ROLES, PRODUCT_STATUS } from '../src/constants/index.js';

// Tests de integración: se permite inspeccionar directamente la persistencia.
const users = [];
const products = [];
describe('Flujos HTTP con MongoDB real y descartable', () => {
  before(async () => {
    const config = loadConfig();
    const database = new URL(config.mongodbUri).pathname.slice(1);
    if (config.nodeEnv !== 'test' || !database.endsWith('_test')) {
      throw new Error('Se requiere NODE_ENV=test y una base terminada en _test.');
    }
    await connectDatabase(config.mongodbUri);
    await Promise.all([User.init(), Product.init()]);
  });
  after(async () => {
    try {
      if (users.length) await User.deleteMany({ _id: { $in: users } });
      if (products.length) await Product.deleteMany({ _id: { $in: products } });
    } finally { await disconnectDatabase(); }
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
