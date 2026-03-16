const { Router } = require('express');
const { z } = require('zod');
const service = require('./distribution.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const router = Router();

router.get('/distributions', (req, res) => {
  const dists = service.findAll(req.query);
  res.json({ data: dists });
});

router.get('/distributions/platforms', (req, res) => {
  res.json({ data: service.getPlatforms() });
});

router.get('/releases/:releaseId/distributions', (req, res) => {
  const dists = service.findByRelease(req.params.releaseId);
  res.json({ data: dists });
});

router.post('/releases/:releaseId/distributions', validateRequest({
  body: z.object({
    platform: z.string().min(1),
    distributor: z.string().max(100).optional()
  })
}), (req, res) => {
  const dist = service.create({ release_id: req.params.releaseId, ...req.body });
  res.status(201).json({ data: dist });
});

router.post('/releases/:releaseId/distributions/all', validateRequest({
  body: z.object({
    distributor: z.string().max(100).optional()
  })
}), (req, res) => {
  const dists = service.createAll(req.params.releaseId, req.body.distributor);
  res.status(201).json({ data: dists });
});

router.put('/distributions/:id', validateRequest({
  body: z.object({
    status: z.enum(['not_submitted', 'submitted', 'in_review', 'live', 'rejected', 'taken_down']).optional(),
    distributor: z.string().max(100).optional(),
    submitted_date: z.string().optional(),
    live_date: z.string().optional(),
    external_url: z.string().max(500).optional(),
    external_id: z.string().max(100).optional(),
    notes: z.string().max(2000).optional()
  })
}), (req, res) => {
  const dist = service.update(req.params.id, req.body);
  res.json({ data: dist });
});

router.delete('/distributions/:id', (req, res) => {
  service.remove(req.params.id);
  res.json({ message: 'Distribution removed' });
});

module.exports = router;
