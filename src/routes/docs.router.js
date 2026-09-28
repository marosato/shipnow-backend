import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { createSwaggerSpec } from '../docs/swagger.config.js';

export function createDocsRouter(options) {
  const router = Router();
  const spec = createSwaggerSpec(options);
  router.get('/openapi.json', (req, res) => res.json(spec));
  // serveFiles mantiene la especificación aislada por instancia de Express.
  router.use('/', swaggerUi.serveFiles(spec), swaggerUi.setup(spec, {
    customSiteTitle: 'ShipNow · API Docs',
    swaggerOptions: { validatorUrl: null, persistAuthorization: false },
  }));
  return router;
}
