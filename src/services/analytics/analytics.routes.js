const { Router } = require('express');
const service = require('./analytics.service');

const router = Router();

router.get('/overview', (req, res) => {
  const data = service.getOverview();
  res.json({ data });
});

router.get('/tracks/:trackId', (req, res) => {
  const data = service.getTrackStats(req.params.trackId);
  res.json({ data });
});

router.get('/platforms', (req, res) => {
  const data = service.getPlatformStats();
  res.json({ data });
});

router.post('/seed', (req, res) => {
  const result = service.seedData();
  res.json({ data: result });
});

module.exports = router;
