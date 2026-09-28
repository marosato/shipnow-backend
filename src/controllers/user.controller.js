import * as service from '../services/user.service.js';

export async function list(req, res, next) {
  try { res.status(200).json({ status: 'success', data: await service.list(req.query) }); }
  catch (error) { next(error); }
}

export async function getById(req, res, next) {
  try { res.status(200).json({ status: 'success', data: await service.getById(req.params.id) }); }
  catch (error) { next(error); }
}

export async function create(req, res, next) {
  try { res.status(201).json({ status: 'success', data: await service.create(req.body) }); }
  catch (error) { next(error); }
}
