export const USER_ROLES = Object.freeze({ ADMIN: 'admin', USER: 'user', DRIVER: 'driver' });
export const PRODUCT_STATUS = Object.freeze({ AVAILABLE: 'available', OUT_OF_STOCK: 'out_of_stock' });

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending', ASSIGNED: 'assigned', IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered', CANCELLED: 'cancelled',
});
export const DELIVERY_PRIORITY = Object.freeze({ LOW: 'low', NORMAL: 'normal', HIGH: 'high' });
export const MOCK_LIMITS = Object.freeze({ DEFAULT_QTY: 10, MAX_QTY: 100 });
