import { performance } from 'node:perf_hooks';
import { logger } from '../config/logger.config.js';

export function requestLogger(req, res, next) {
  const start = performance.now();
  res.once('finish', () => {
    // Usar patrón de ruta, no URL original: evita query strings e IDs del cliente.
    const route = typeof req.route?.path === 'string'
      ? `${res.locals.logBase ?? ''}${req.route.path}`.replace(/\/$/, '') || '/' : 'UNMATCHED';
    logger.http('HTTP_REQUEST', { method: req.method, route,
      statusCode: res.statusCode, durationMs: Math.round((performance.now() - start) * 100) / 100 });
  });
  next();
}
