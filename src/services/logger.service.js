import { logger, LOG_LEVELS } from '../config/logger.config.js';

export function generateTestLogs() {
  for (const level of Object.keys(LOG_LEVELS)) {
    logger.log(level, 'LOGGER_TEST', { simulated: true });
  }
  return { message: 'Logs de prueba generados.', levels: Object.keys(LOG_LEVELS) };
}
