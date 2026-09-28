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
