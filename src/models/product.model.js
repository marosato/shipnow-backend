import { Schema, model } from 'mongoose';
import { PRODUCT_STATUS } from '../constants/index.js';

const productSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  status: { type: String, required: true, enum: Object.values(PRODUCT_STATUS) },
}, { timestamps: true, versionKey: false });

export default model('Product', productSchema);
