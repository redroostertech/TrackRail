const { Router } = require('express');
const { z } = require('zod');
const service = require('./copyright.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const router = Router();

router.get('/copyrights', (req, res) => {
  const copyrights = service.findAll(req.query);
  res.json({ data: copyrights });
});

router.get('/tracks/:trackId/copyrights', (req, res) => {
  const copyrights = service.findByTrack(req.params.trackId);
  res.json({ data: copyrights });
});

router.post('/tracks/:trackId/copyrights', validateRequest({
  body: z.object({
    copyright_type: z.enum(['sr', 'pa']).optional(),
    claimant_name: z.string().max(200).optional(),
    author_name: z.string().max(200).optional(),
    year_completed: z.string().max(4).optional(),
    year_published: z.string().max(4).optional()
  })
}), (req, res) => {
  const cr = service.create({ track_id: req.params.trackId, ...req.body });
  res.status(201).json({ data: cr });
});

router.put('/copyrights/:id', validateRequest({
  body: z.object({
    status: z.enum(['not_started', 'form_generated', 'submitted', 'pending', 'registered']).optional(),
    registration_number: z.string().max(50).optional(),
    claimant_name: z.string().max(200).optional(),
    author_name: z.string().max(200).optional(),
    year_completed: z.string().max(4).optional(),
    year_published: z.string().max(4).optional(),
    submitted_date: z.string().optional(),
    registered_date: z.string().optional(),
    notes: z.string().max(2000).optional()
  })
}), (req, res) => {
  const cr = service.update(req.params.id, req.body);
  res.json({ data: cr });
});

router.post('/tracks/:trackId/copyrights/prepare', async (req, res, next) => {
  try {
    const form = await service.prepareForm(req.params.trackId);
    res.json({ data: form });
  } catch (err) { next(err); }
});

module.exports = router;
