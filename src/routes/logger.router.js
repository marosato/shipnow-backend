import { Router } from 'express';
import { test } from '../controllers/logger.controller.js';
const router = Router();
router.get('/loggerTest', test);
export default router;
