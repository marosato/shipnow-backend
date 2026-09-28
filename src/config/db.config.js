import { logger } from './logger.config.js';
import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, bufferCommands: false });
    logger.info('MONGODB_CONNECTED');
  } catch (error) {
    logger.error('MONGODB_CONNECTION_FAILED');
    throw error;
  }
}

export async function disconnectDatabase() {
  const wasOpen = mongoose.connection.readyState !== 0;
  await mongoose.disconnect();
  if (wasOpen) logger.info('MONGODB_DISCONNECTED');
}
