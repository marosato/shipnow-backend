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
