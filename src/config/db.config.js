import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, bufferCommands: false });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
