import { Router } from 'express';
import * as controller from '../controllers/mock.controller.js';

const router = Router();
router.get('/users', controller.users);
router.get('/dataset', controller.dataset);
router.post('/seed', controller.seed);
export default router;
