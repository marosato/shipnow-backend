import { Schema, model } from 'mongoose';
import { USER_ROLES } from '../constants/index.js';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  mockBatchId: { type: String, index: true },
  role: { type: String, required: true, enum: Object.values(USER_ROLES) },
}, { timestamps: true, versionKey: false });

export default model('User', userSchema);
