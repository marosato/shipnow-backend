import { Schema, model } from 'mongoose';
import { ORDER_STATUS, DELIVERY_PRIORITY } from '../constants/index.js';

const itemSchema = new Schema({
  name: { type: String, required: true, maxlength: 120 },
  quantity: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  address: { type: String, required: true, maxlength: 250 },
  items: { type: [itemSchema], required: true, validate: value => value.length > 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, required: true, enum: Object.values(ORDER_STATUS) },
  priority: { type: String, required: true, enum: Object.values(DELIVERY_PRIORITY) },
  mockBatchId: { type: String, index: true },
}, { timestamps: true, versionKey: false });

export default model('Order', orderSchema);
