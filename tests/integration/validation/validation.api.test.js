const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Set up in-memory database BEFORE loading the app
// Variable MUST be prefixed with 'mock' for jest.mock() scoping rules
const MIGRATIONS_DIR = path.join(__dirname, '../../../src/migrations');
const mockDb = new Database(':memory:');
mockDb.pragma('journal_mode = WAL');
mockDb.pragma('foreign_keys = ON');

const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
for (const file of migrationFiles) {
  mockDb.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
}

// Mock the database module
jest.mock('../../../src/database', () => ({
  getDb: () => mockDb,
  initialize: jest.fn()
}));

// Now require the app
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('../../../src/shared/errors/error-handler');
const supertest = require('supertest');

// Build a test app with only the routes we need
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1/releases', require('../../../src/services/releases/releases.routes'));
app.use('/api/v1', require('../../../src/services/tracks/tracks.routes'));
const { validationRouter, releaseValidationRouter } = require('../../../src/services/validation/validation.routes');
app.use('/api/v1/validation', validationRouter);
app.use('/api/v1/releases', releaseValidationRouter);
app.use(errorHandler);

const request = supertest(app);

// ---- Seed test data ----
const { v4: uuid } = require('uuid');
let testReleaseId;
let testTrackId;

beforeAll(() => {
  testReleaseId = uuid();
  testTrackId = uuid();

  mockDb.prepare(`INSERT INTO releases (id, title, release_type, status, genre) VALUES (?, ?, ?, ?, ?)`).run(
    testReleaseId, 'Integration Test Release', 'single', 'draft', 'Pop'
  );

  mockDb.prepare(`INSERT INTO tracks (id, release_id, title, track_number, file_path, file_name) VALUES (?, ?, ?, ?, ?, ?)`).run(
    testTrackId, testReleaseId, 'Integration Track', 1, '/uploads/test.wav', 'test.wav'
  );
});

afterAll(() => {
  mockDb.close();
});

describe('Validation API Integration', () => {
  describe('GET /api/v1/validation/rules', () => {
    test('returns 200 with seeded rules', async () => {
      const res = await request.get('/api/v1/validation/rules');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(14);
    });

    test('filters by category', async () => {
      const res = await request.get('/api/v1/validation/rules?category=title');
      expect(res.status).toBe(200);
      expect(res.body.data.every(r => r.category === 'title')).toBe(true);
    });

    test('filters by scope', async () => {
      const res = await request.get('/api/v1/validation/rules?scope=track');
      expect(res.status).toBe(200);
      expect(res.body.data.every(r => r.scope === 'track')).toBe(true);
    });

    test('filters by severity', async () => {
      const res = await request.get('/api/v1/validation/rules?severity=error');
      expect(res.status).toBe(200);
      expect(res.body.data.every(r => r.severity === 'error')).toBe(true);
    });
  });

  describe('GET /api/v1/validation/rules/:id', () => {
    test('returns 200 with rule', async () => {
      const res = await request.get('/api/v1/validation/rules/vr-001');
      expect(res.status).toBe(200);
      expect(res.body.data.rule_key).toBe('release.title_required');
    });

    test('returns 404 for nonexistent rule', async () => {
      const res = await request.get('/api/v1/validation/rules/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/validation/rules/:id', () => {
    test('updates rule severity', async () => {
      const res = await request.put('/api/v1/validation/rules/vr-005').send({ severity: 'info' });
      expect(res.status).toBe(200);
      expect(res.body.data.severity).toBe('info');
      // Version should have incremented
      expect(res.body.data.version).toBeGreaterThan(1);

      // Restore
      await request.put('/api/v1/validation/rules/vr-005').send({ severity: 'warning' });
    });

    test('returns 400 for invalid severity', async () => {
      const res = await request.put('/api/v1/validation/rules/vr-001').send({ severity: 'catastrophic' });
      expect(res.status).toBe(400);
    });

    test('disables a rule', async () => {
      const res = await request.put('/api/v1/validation/rules/vr-014').send({ enabled: 0 });
      expect(res.status).toBe(200);
      expect(res.body.data.enabled).toBe(0);

      // Re-enable
      await request.put('/api/v1/validation/rules/vr-014').send({ enabled: 1 });
    });
  });

  describe('POST /api/v1/releases/:releaseId/validate', () => {
    test('creates validation run and returns results', async () => {
      const res = await request.post(`/api/v1/releases/${testReleaseId}/validate`);
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('run');
      expect(res.body.data).toHaveProperty('results');
      expect(res.body.data).toHaveProperty('decision');
      expect(res.body.data.run.status).toBe('completed');
      expect(res.body.data.run.release_id).toBe(testReleaseId);
      expect(res.body.data.results).toBeInstanceOf(Array);
      expect(res.body.data.results.length).toBeGreaterThan(0);
    });

    test('returns 404 for nonexistent release', async () => {
      const res = await request.post('/api/v1/releases/nonexistent-id/validate');
      expect(res.status).toBe(404);
    });

    test('decision reflects validation outcome', async () => {
      const res = await request.post(`/api/v1/releases/${testReleaseId}/validate`);
      // Release has no release_date and no artwork, so should have at least warnings
      expect(res.body.data.decision).toBeTruthy();
      expect(['approved', 'flagged', 'blocked']).toContain(res.body.data.decision.outcome);
    });
  });

  describe('GET /api/v1/releases/:releaseId/validation', () => {
    test('returns latest validation results', async () => {
      // Run validation first
      await request.post(`/api/v1/releases/${testReleaseId}/validate`);

      const res = await request.get(`/api/v1/releases/${testReleaseId}/validation`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('run');
      expect(res.body.data).toHaveProperty('results');
    });

    test('returns null when no validation runs exist', async () => {
      const newReleaseId = uuid();
      mockDb.prepare('INSERT INTO releases (id, title, release_type) VALUES (?, ?, ?)').run(newReleaseId, 'No Validation', 'single');

      const res = await request.get(`/api/v1/releases/${newReleaseId}/validation`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  describe('GET /api/v1/releases/:releaseId/validation/history', () => {
    test('returns array of runs', async () => {
      // Run validation twice
      await request.post(`/api/v1/releases/${testReleaseId}/validate`);
      await request.post(`/api/v1/releases/${testReleaseId}/validate`);

      const res = await request.get(`/api/v1/releases/${testReleaseId}/validation/history`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PUT /api/v1/validation/results/:id/acknowledge', () => {
    test('acknowledges a validation result', async () => {
      // Get a result to acknowledge
      const runRes = await request.post(`/api/v1/releases/${testReleaseId}/validate`);
      const warningResult = runRes.body.data.results.find(r => r.status === 'warning');

      if (warningResult) {
        const res = await request.put(`/api/v1/validation/results/${warningResult.id}/acknowledge`);
        expect(res.status).toBe(200);
        expect(res.body.data.acknowledged).toBe(1);
      }
    });

    test('returns 404 for nonexistent result', async () => {
      const res = await request.put('/api/v1/validation/results/nonexistent/acknowledge');
      expect(res.status).toBe(404);
    });
  });
});
