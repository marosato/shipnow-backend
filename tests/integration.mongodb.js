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
