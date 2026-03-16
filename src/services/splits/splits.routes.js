const { Router } = require('express');
const { z } = require('zod');
const service = require('./splits.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const router = Router();

router.get('/tracks/:trackId/splits', (req, res) => {
  const splits = service.findByTrack(req.params.trackId);
  res.json({ data: splits });
});

router.post('/tracks/:trackId/splits', validateRequest({
  body: z.object({
    collaborator_id: z.string().uuid(),
    role: z.enum(['writer', 'producer', 'publisher']),
    percentage: z.number().min(0.01).max(100)
  })
}), (req, res) => {
  const split = service.create({ track_id: req.params.trackId, ...req.body });
  res.status(201).json({ data: split });
});

router.put('/splits/:id', validateRequest({
  body: z.object({
    percentage: z.number().min(0.01).max(100).optional(),
    role: z.enum(['writer', 'producer', 'publisher']).optional(),
    agreed: z.number().int().min(0).max(1).optional()
  })
}), (req, res) => {
  const split = service.update(req.params.id, req.body);
  res.json({ data: split });
});

router.delete('/splits/:id', (req, res) => {
  service.remove(req.params.id);
  res.json({ message: 'Split removed' });
});

router.get('/tracks/:trackId/splits/validate', (req, res) => {
  const result = service.validate(req.params.trackId);
  res.json({ data: result });
});

router.get('/tracks/:trackId/splits/export', (req, res) => {
  const sheet = service.exportSheet(req.params.trackId);
  res.json({ data: sheet });
});

router.post('/tracks/:trackId/splits/suggest', async (req, res, next) => {
  try {
    const suggestions = await service.suggest(req.params.trackId);
    res.json({ data: suggestions });
  } catch (err) { next(err); }
});

module.exports = router;
