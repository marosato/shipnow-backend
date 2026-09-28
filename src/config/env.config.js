import dotenv from 'dotenv';

// Único módulo autorizado para leer process.env.
export function validateEnv(source) {
  for (const key of ['PORT', 'NODE_ENV', 'MONGODB_URI']) {
    if (typeof source[key] !== 'string' || !source[key].trim()) {
      throw new Error(`Configuración inválida: falta ${key}.`);
    }
  }
  const portText = source.PORT.trim();
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configuración inválida: PORT debe ser un entero entre 1 y 65535.');
  }
  const nodeEnv = source.NODE_ENV.trim();
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('Configuración inválida: NODE_ENV debe ser development, test o production.');
  }
  const mongodbUri = source.MONGODB_URI.trim();
  if (!/^mongodb(?:\+srv)?:\/\/[^\s]+$/.test(mongodbUri)) {
    throw new Error('Configuración inválida: MONGODB_URI debe ser una URI MongoDB.');
  }
  return Object.freeze({ port, nodeEnv, mongodbUri });
}

export function loadConfig() {
  dotenv.config({ quiet: true });
  return validateEnv(process.env);
}
