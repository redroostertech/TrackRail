require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initialize } = require('./database');
const { errorHandler } = require('./shared/errors/error-handler');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initialize();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/v1/releases', require('./services/releases/releases.routes'));
app.use('/api/v1', require('./services/tracks/tracks.routes'));
app.use('/api/v1/collaborators', require('./services/collaborators/collaborators.routes'));
app.use('/api/v1', require('./services/splits/splits.routes'));
app.use('/api/v1', require('./services/copyright/copyright.routes'));
app.use('/api/v1', require('./services/pro-registration/pro-registration.routes'));
app.use('/api/v1', require('./services/distribution/distribution.routes'));
app.use('/api/v1', require('./services/calendar/calendar.routes'));
app.use('/api/v1/analytics', require('./services/analytics/analytics.routes'));

// Foundation services
app.use('/api/v1/events', require('./services/events/events.routes'));
app.use('/api/v1/decisions', require('./services/decisions/decisions.routes'));
app.use('/api/v1/identifiers', require('./services/identifiers/identifiers.routes'));

// Artist profile
const { getDb } = require('./database');
app.get('/api/v1/artist', (req, res) => {
  const artist = getDb().prepare('SELECT * FROM artist WHERE id = 1').get();
  res.json({ data: artist });
});
app.put('/api/v1/artist', (req, res) => {
  const db = getDb();
  const { name, email, pro_affiliation, pro_member_id, ipi_number, publisher_name } = req.body;
  db.prepare(`UPDATE artist SET name = COALESCE(?, name), email = COALESCE(?, email),
    pro_affiliation = COALESCE(?, pro_affiliation), pro_member_id = COALESCE(?, pro_member_id),
    ipi_number = COALESCE(?, ipi_number), publisher_name = COALESCE(?, publisher_name),
    updated_at = datetime('now') WHERE id = 1`).run(name, email, pro_affiliation, pro_member_id, ipi_number, publisher_name);
  const artist = db.prepare('SELECT * FROM artist WHERE id = 1').get();
  res.json({ data: artist });
});

// AI status
const aiService = require('./services/ai/ai.service');
app.get('/api/v1/ai/status', (req, res) => {
  res.json({ data: { enabled: aiService.isEnabled(), suggestedReleaseDate: aiService.suggestReleaseDate() } });
});

// SPA fallback - serve index.html for non-API, non-file routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.includes('.')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n  TrackRail running at http://localhost:${PORT}\n`);
  console.log(`  AI: ${aiService.isEnabled() ? 'OpenAI connected' : 'Mock mode (set OPENAI_API_KEY for real AI)'}\n`);
});
