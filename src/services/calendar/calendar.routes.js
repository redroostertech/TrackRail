const { Router } = require('express');
const { z } = require('zod');
const service = require('./calendar.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const router = Router();

router.get('/calendar', (req, res) => {
  const milestones = service.findAll(req.query);
  res.json({ data: milestones });
});

router.get('/releases/:releaseId/milestones', (req, res) => {
  const milestones = service.findByRelease(req.params.releaseId);
  res.json({ data: milestones });
});

router.post('/releases/:releaseId/milestones', validateRequest({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    due_date: z.string(),
    milestone_type: z.enum(['upload', 'metadata', 'splits', 'copyright', 'pro', 'distribution', 'marketing', 'launch', 'custom']).optional(),
    sort_order: z.number().int().optional()
  })
}), (req, res) => {
  const milestone = service.create({ release_id: req.params.releaseId, ...req.body });
  res.status(201).json({ data: milestone });
});

router.post('/releases/:releaseId/milestones/generate', async (req, res, next) => {
  try {
    const milestones = await service.generate(req.params.releaseId);
    res.status(201).json({ data: milestones });
  } catch (err) { next(err); }
});

router.put('/milestones/:id', validateRequest({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    due_date: z.string().optional(),
    milestone_type: z.enum(['upload', 'metadata', 'splits', 'copyright', 'pro', 'distribution', 'marketing', 'launch', 'custom']).optional(),
    sort_order: z.number().int().optional()
  })
}), (req, res) => {
  const milestone = service.update(req.params.id, req.body);
  res.json({ data: milestone });
});

router.put('/milestones/:id/complete', (req, res) => {
  const milestone = service.complete(req.params.id);
  res.json({ data: milestone });
});

router.put('/milestones/:id/uncomplete', (req, res) => {
  const milestone = service.uncomplete(req.params.id);
  res.json({ data: milestone });
});

router.delete('/milestones/:id', (req, res) => {
  service.remove(req.params.id);
  res.json({ message: 'Milestone deleted' });
});

module.exports = router;
