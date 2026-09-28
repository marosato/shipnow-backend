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
