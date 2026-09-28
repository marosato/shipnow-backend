import express from 'express';
import usersRouter from './routes/users.router.js';
import productsRouter from './routes/products.router.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use((req, res, next) => next(new AppError(404, 'Ruta no encontrada.')));
app.use(errorHandler);
export default app;
