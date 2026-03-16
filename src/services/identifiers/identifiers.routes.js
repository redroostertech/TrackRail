const { Router } = require('express');
const { z } = require('zod');
const service = require('./identifiers.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const router = Router();

// Get identifiers for an entity
router.get('/:entityType/:entityId', (req, res) => {
  const identifiers = service.getForEntity(req.params.entityType, req.params.entityId);
  res.json({ data: identifiers });
});

// Lookup an identifier
router.get('/lookup/:type/:value', (req, res) => {
  const identifier = service.lookup(req.params.type, req.params.value);
  res.json({ data: identifier || null });
});

// Assign an identifier
router.post('/', validateRequest({
  body: z.object({
    identifier_type: z.enum(['isrc', 'upc', 'iswc', 'ipi', 'isni', 'pro_member_id']),
    identifier_value: z.string().min(1).max(50),
    entity_type: z.string().min(1),
    entity_id: z.string().uuid(),
    source: z.enum(['manual', 'generated', 'imported', 'verified']).optional()
  })
}), (req, res) => {
  const identifier = service.assign(
    req.body.identifier_type,
    req.body.identifier_value,
    req.body.entity_type,
    req.body.entity_id,
    { source: req.body.source }
  );
  res.status(201).json({ data: identifier });
});

module.exports = router;
