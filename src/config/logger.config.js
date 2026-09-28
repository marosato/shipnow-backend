import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const LOG_LEVELS = Object.freeze({ fatal: 0, error: 1, warning: 2, info: 3, http: 4, debug: 5 });
export const LOG_POLICY = Object.freeze({ maxsize: '5m', maxFiles: 5 });
export const LOG_DIRECTORY = fileURLToPath(new URL('../../logs/', import.meta.url));

function options({ nodeEnv = 'test', silent = false, files = true,
  directory = LOG_DIRECTORY, maxsize = LOG_POLICY.maxsize,
  maxFiles = LOG_POLICY.maxFiles, consoleStream } = {}) {
  const consoleLevel = nodeEnv === 'development' ? 'debug' : 'info';
  const outputs = [consoleStream
    ? new winston.transports.Stream({ stream: consoleStream, level: consoleLevel })
    : new winston.transports.Console({ level: consoleLevel })];
  if (files) {
    mkdirSync(directory, { recursive: true });
    outputs.push(new DailyRotateFile({ dirname: directory, filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD', utc: true, level: 'error', maxSize: maxsize, maxFiles,
      auditFile: join(directory, 'rotation-audit.json') }));
  }
  return { levels: LOG_LEVELS, level: 'debug', silent,
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: outputs, exitOnError: false };
}

function handleTransportError() {
  // Último recurso centralizado: no intentar registrar un fallo del logger en sí mismo.
  process.stderr.write('LOGGER_FAILURE: no se pudo escribir un registro.\n');
}

export function createLogger(config) {
  const instance = winston.createLogger(options(config));
  instance.on('error', handleTransportError);
  return instance;
}

// Importar app/services en tests no abre archivos ni carga el entorno.
export const logger = createLogger({ silent: true, files: false });

export function configureLogger(config) {
  let configuration;
  try { configuration = options(config); }
  catch (error) {
    logger.configure(options({ nodeEnv: 'production', files: false }));
    logger.fatal('LOGGER_SETUP_FAILED');
    throw error;
  }
  for (const transport of logger.transports) transport.close?.();
  logger.configure(configuration);
  return logger;
}

export function closeLogger(instance = logger) {
  return new Promise(resolve => {
    instance.once('finish', () => {
      // Winston termina antes de que el transporte cierre su flujo de archivos.
      const pending = instance.transports.filter(t => t instanceof DailyRotateFile)
        .map(transport => new Promise(done => transport.once('finish', done)));
      instance.close();
      Promise.all(pending).then(resolve);
    });
    instance.end();
  });
}
