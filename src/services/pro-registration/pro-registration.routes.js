const { Router } = require('express');
const { z } = require('zod');
const service = require('./pro-registration.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const router = Router();

router.get('/pro-registrations', (req, res) => {
  const regs = service.findAll(req.query);
  res.json({ data: regs });
});

router.get('/tracks/:trackId/pro-registrations', (req, res) => {
  const regs = service.findByTrack(req.params.trackId);
  res.json({ data: regs });
});

router.post('/tracks/:trackId/pro-registrations', validateRequest({
  body: z.object({
    pro_name: z.enum(['ascap', 'bmi', 'sesac'])
  })
}), (req, res) => {
  const reg = service.create({ track_id: req.params.trackId, ...req.body });
  res.status(201).json({ data: reg });
});

router.put('/pro-registrations/:id', validateRequest({
  body: z.object({
    status: z.enum(['not_started', 'submitted', 'pending', 'registered']).optional(),
    work_id: z.string().max(50).optional(),
    submitted_date: z.string().optional(),
    registered_date: z.string().optional(),
    iswc_code: z.string().max(20).optional(),
    notes: z.string().max(2000).optional()
  })
}), (req, res) => {
  const reg = service.update(req.params.id, req.body);
  res.json({ data: reg });
});

module.exports = router;
