const { Router } = require('express');
const service = require('./events.service');

const router = Router();

// Get recent events (activity feed)
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const events = service.getRecent(limit, offset);
  res.json({ data: events });
});

// Get events for a specific entity
router.get('/:entityType/:entityId', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const events = service.getEntityHistory(req.params.entityType, req.params.entityId, limit);
  res.json({ data: events });
});

module.exports = router;
