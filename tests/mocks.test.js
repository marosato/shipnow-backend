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
