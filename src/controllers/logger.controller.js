import { generateTestLogs } from '../services/logger.service.js';

export function test(req, res, next) {
  try { res.status(200).json({ status: 'success', data: generateTestLogs() }); }
  catch (error) { next(error); }
}
