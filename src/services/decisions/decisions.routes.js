const { Router } = require('express');
const { z } = require('zod');
const service = require('./decisions.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const router = Router();

// Get latest decision for an entity
router.get('/:entityType/:entityId', (req, res) => {
  const decisions = service.getHistory(req.params.entityType, req.params.entityId);
  res.json({ data: decisions });
});

// Get latest decision of a specific type
router.get('/:entityType/:entityId/:decisionType', (req, res) => {
  const decision = service.getLatest(req.params.entityType, req.params.entityId, req.params.decisionType);
  res.json({ data: decision || null });
});

// Override a decision (admin action)
router.put('/:id/override', validateRequest({
  body: z.object({
    overridden_by: z.string().default('admin'),
    reason: z.string().min(1).max(500)
  })
}), (req, res) => {
  const decision = service.override(req.params.id, req.body.overridden_by, req.body.reason);
  res.json({ data: decision });
});

module.exports = router;
