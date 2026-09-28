# Código archivo por archivo — Módulo 4

Cambios respecto de 7983ac0. Se conserva M3 en archivos no listados.

## .env.example

```text
PORT=8080
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/shipnow_development

# Activar solo para desarrollo local. En producción se ignora.
ENABLE_MOCKS=true

# Herramienta local de verificación del logger; siempre apagada en production.
ENABLE_LOGGER_TEST=true

```

## package.json

```json
{
  "name": "shipnow-backend",
  "version": "0.4.0",
  "private": true,
  "type": "module",
  "description": "Backend III - Módulos 1 a 4",
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
    "winston": "3.19.0",
    "winston-daily-rotate-file": "5.0.0"
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
import loggerRouter from './routes/logger.router.js';
import { requestLogger } from './middlewares/request-logger.js';
import { ERRORS } from './errors/error-catalog.js';
import express from 'express';
import usersRouter from './routes/users.router.js';
import productsRouter from './routes/products.router.js';
import mocksRouter from './routes/mocks.router.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';

export function createApp({ mocksEnabled = false, loggerTestEnabled = false } = {}) {
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
  mount('/api/users', usersRouter);
  mount('/api/products', productsRouter);
  if (mocksEnabled) mount('/api/mocks', mocksRouter);
  app.use((req, res, next) => next(new AppError(ERRORS.ROUTE_NOT_FOUND)));
  app.use(errorHandler);
  return app;
}

export default createApp();

```

## src/config/db.config.js

```javascript
import { logger } from './logger.config.js';
import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, bufferCommands: false });
    logger.info('MONGODB_CONNECTED');
  } catch (error) {
    logger.error('MONGODB_CONNECTION_FAILED');
    throw error;
  }
}

export async function disconnectDatabase() {
  const wasOpen = mongoose.connection.readyState !== 0;
  await mongoose.disconnect();
  if (wasOpen) logger.info('MONGODB_DISCONNECTED');
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
  const flag = source.ENABLE_MOCKS ?? 'false';
  if (!['true', 'false'].includes(flag)) {
    throw new Error('Configuración inválida: ENABLE_MOCKS debe ser true o false.');
  }
  const loggerFlag = source.ENABLE_LOGGER_TEST ?? 'false';
  if (!['true', 'false'].includes(loggerFlag)) {
    throw new Error('Configuración inválida: ENABLE_LOGGER_TEST debe ser true o false.');
  }
  return Object.freeze({ loggerTestEnabled: loggerFlag === 'true' && nodeEnv !== 'production', port, nodeEnv, mongodbUri,
    mocksEnabled: flag === 'true' && nodeEnv !== 'production' });
}

export function loadConfig() {
  dotenv.config({ quiet: true });
  return validateEnv(process.env);
}

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
  return new Promise(resolve => {
    instance.once('finish', () => {
      // Winston termina antes de que el transporte cierre su flujo de archivos.
      const pending = instance.transports.filter(t => t instanceof DailyRotateFile)
        .map(transport => new Promise(done => transport.once('finish', done)));
      instance.close();
      Promise.all(pending).then(resolve);
    });
    instance.end();
  });
}

```

## src/controllers/logger.controller.js

```javascript
import { generateTestLogs } from '../services/logger.service.js';

export function test(req, res, next) {
  try { res.status(200).json({ status: 'success', data: generateTestLogs() }); }
  catch (error) { next(error); }
}

```

## src/middlewares/error-handler.js

```javascript
import { logger } from '../config/logger.config.js';
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
  const metadata = { code: definition.code, statusCode: definition.statusCode };
  if (error instanceof AppError && /^[0-9a-f-]{36}$/.test(error.context?.batchId ?? '')) {
    metadata.batchId = error.context.batchId;
  }
  // Nunca serializar el error, sus causas, req.body, headers o URI de conexión.
  const level = definition.statusCode >= 500 ? 'error' : 'warning';
  logger.log(level, 'API_ERROR', metadata);
  res.status(definition.statusCode).json({
    status: 'error', error: definition.code, message: definition.message,
  });
}

```

## src/middlewares/request-logger.js

```javascript
import { performance } from 'node:perf_hooks';
import { logger } from '../config/logger.config.js';

export function requestLogger(req, res, next) {
  const start = performance.now();
  res.once('finish', () => {
    // Usar patrón de ruta, no URL original: evita query strings e IDs del cliente.
    const route = typeof req.route?.path === 'string'
      ? `${res.locals.logBase ?? ''}${req.route.path}`.replace(/\/$/, '') || '/' : 'UNMATCHED';
    logger.http('HTTP_REQUEST', { method: req.method, route,
      statusCode: res.statusCode, durationMs: Math.round((performance.now() - start) * 100) / 100 });
  });
  next();
}

```

## src/routes/logger.router.js

```javascript
import { Router } from 'express';
import { test } from '../controllers/logger.controller.js';
const router = Router();
router.get('/loggerTest', test);
export default router;

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
    logger.info('SERVER_STARTED', { port: config.port, address: `ShipNow M4 disponible en http://127.0.0.1:${config.port}` });
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

## src/services/logger.service.js

```javascript
import { logger, LOG_LEVELS } from '../config/logger.config.js';

export function generateTestLogs() {
  for (const level of Object.keys(LOG_LEVELS)) {
    logger.log(level, 'LOGGER_TEST', { simulated: true });
  }
  return { message: 'Logs de prueba generados.', levels: Object.keys(LOG_LEVELS) };
}

```

## src/services/mock.service.js

```javascript
import { logger } from '../config/logger.config.js';
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
    preview(query) {
      const qty = parseQueryQty(query);
      const dataset = generateDataset(qty);
      logger.debug('MOCK_PREVIEW_CREATED', { qty, batchId: dataset.batchId });
      return dataset;
    },
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
      logger.info('MOCK_BATCH_INSERTED', { batchId, qty: users.length, total: users.length * 4 });
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
import { logger } from '../config/logger.config.js';
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

export async function create(body) {
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
  const created = await repository.create({ name, price: body.price, stock: body.stock, status });
  logger.info('PRODUCT_CREATED', { id: String(created._id) });
  return created;
}

```

## src/services/user.service.js

```javascript
import { logger } from '../config/logger.config.js';
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

export async function create(body) {
  validateBody(body, ['name', 'email']);
  const name = requiredText(body.name, 'name', 120);
  const email = requiredText(body.email, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(ERRORS.INVALID_EMAIL);
  }
  // No se acepta un rol elevado desde el body de una ruta sin autenticación.
  const created = await repository.create({ name, email, role: USER_ROLES.USER });
  logger.info('USER_CREATED', { id: String(created._id) });
  return created;
}

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
      const filename = (await readdir(directory)).find(name => /^error-.*\.log$/.test(name));
      const records = (await readFile(join(directory, filename), 'utf8')).trim().split('\n').map(JSON.parse);
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
