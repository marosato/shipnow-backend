import { mockService } from '../services/mock.service.js';

export async function dataset(req, res, next) {
  try { res.status(200).json({ status: 'success', data: mockService.preview(req.query) }); }
  catch (error) { next(error); }
}

export async function users(req, res, next) {
  try { res.status(200).json({ status: 'success', data: mockService.preview(req.query).users }); }
  catch (error) { next(error); }
}

export async function seed(req, res, next) {
  try { res.status(201).json({ status: 'success', data: await mockService.seed(req.body, req.query) }); }
  catch (error) { next(error); }
}
