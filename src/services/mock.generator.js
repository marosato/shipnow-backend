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
