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
