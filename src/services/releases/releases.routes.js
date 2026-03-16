const { Router } = require('express');
const { z } = require('zod');
const service = require('./releases.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const router = Router();

router.get('/', (req, res) => {
  const releases = service.findAll(req.query);
  res.json({ data: releases });
});

router.post('/', validateRequest({
  body: z.object({
    title: z.string().min(1).max(200),
    release_type: z.enum(['single', 'ep', 'album']).optional(),
    genre: z.string().max(100).optional(),
    subgenre: z.string().max(100).optional(),
    label: z.string().max(200).optional(),
    release_date: z.string().optional(),
    description: z.string().max(2000).optional()
  })
}), (req, res) => {
  const release = service.create(req.body);
  res.status(201).json({ data: release });
});

router.get('/stats', (req, res) => {
  res.json({ data: service.getStats() });
});

router.get('/:id', (req, res) => {
  const release = service.findById(req.params.id);
  res.json({ data: release });
});

router.put('/:id', validateRequest({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    release_type: z.enum(['single', 'ep', 'album']).optional(),
    genre: z.string().max(100).optional(),
    subgenre: z.string().max(100).optional(),
    label: z.string().max(200).optional(),
    release_date: z.string().optional(),
    description: z.string().max(2000).optional(),
    upc_code: z.string().max(50).optional()
  })
}), (req, res) => {
  const release = service.update(req.params.id, req.body);
  res.json({ data: release });
});

router.put('/:id/status', validateRequest({
  body: z.object({
    status: z.string()
  })
}), (req, res) => {
  const release = service.updateStatus(req.params.id, req.body.status);
  res.json({ data: release });
});

router.get('/:id/checklist', (req, res) => {
  const checklist = service.getChecklist(req.params.id);
  res.json({ data: checklist });
});

router.delete('/:id', (req, res) => {
  service.remove(req.params.id);
  res.json({ message: 'Release deleted' });
});

module.exports = router;
