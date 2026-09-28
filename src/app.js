import { createDocsRouter } from './routes/docs.router.js';
import loggerRouter from './routes/logger.router.js';
import { requestLogger } from './middlewares/request-logger.js';
import { ERRORS } from './errors/error-catalog.js';
import express from 'express';
import usersRouter from './routes/users.router.js';
import productsRouter from './routes/products.router.js';
import mocksRouter from './routes/mocks.router.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';

export function createApp({ mocksEnabled = false, loggerTestEnabled = false, port = 8080 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));
  if (loggerTestEnabled) app.use(loggerRouter);
  // Guardar el prefijo antes de que Express lo restaure al derivar un error.
  const mount = (path, router) => app.use(path, (req, res, next) => {
    res.locals.logBase = path;
    next();
  }, router);
  mount('/api/docs', createDocsRouter({ mocksEnabled, loggerTestEnabled, port }));
  mount('/api/users', usersRouter);
  mount('/api/products', productsRouter);
  if (mocksEnabled) mount('/api/mocks', mocksRouter);
  app.use((req, res, next) => next(new AppError(ERRORS.ROUTE_NOT_FOUND)));
  app.use(errorHandler);
  return app;
}

export default createApp();
