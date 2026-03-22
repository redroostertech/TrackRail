const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const MIGRATIONS_DIR = path.join(__dirname, '../../../src/migrations');
const mockDb = new Database(':memory:');
mockDb.pragma('journal_mode = WAL');
mockDb.pragma('foreign_keys = ON');

const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
for (const file of migrationFiles) {
  mockDb.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
}

jest.mock('../../../src/database', () => ({
  getDb: () => mockDb,
  initialize: jest.fn()
}));

const express = require('express');
const cors = require('cors');
const { errorHandler } = require('../../../src/shared/errors/error-handler');
const supertest = require('supertest');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1/releases', require('../../../src/services/releases/releases.routes'));
app.use('/api/v1', require('../../../src/services/tracks/tracks.routes'));
const { normalizationRouter, releaseNormalizationRouter } = require('../../../src/services/normalization/normalization.routes');
app.use('/api/v1/normalization', normalizationRouter);
app.use('/api/v1/releases', releaseNormalizationRouter);
app.use(errorHandler);

const request = supertest(app);
const { v4: uuid } = require('uuid');

let testReleaseId;
let testTrackId;

beforeAll(() => {
  testReleaseId = uuid();
  testTrackId = uuid();

  mockDb.prepare('INSERT INTO releases (id, title, release_type, status, genre) VALUES (?, ?, ?, ?, ?)').run(
    testReleaseId, '  MY MESSY TITLE  ', 'single', 'draft', 'EDM'
  );

  mockDb.prepare('INSERT INTO tracks (id, release_id, title, track_number, file_path, genre, mood, musical_key, bpm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    testTrackId, testReleaseId, 'the best track', 1, '/uploads/test.wav', 'Rap', 'happy', 'c minor', 120.7
  );
});

afterAll(() => {
  mockDb.close();
});

describe('Normalization API Integration', () => {
  describe('GET /api/v1/normalization/genres', () => {
    test('returns 200 with seeded genres', async () => {
      const res = await request.get('/api/v1/normalization/genres');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(15);
    });

    test('filters by level', async () => {
      const res = await request.get('/api/v1/normalization/genres?level=0');
      expect(res.status).toBe(200);
      expect(res.body.data.every(g => g.level === 0)).toBe(true);
    });

    test('searches by name', async () => {
      const res = await request.get('/api/v1/normalization/genres?search=Pop');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/normalization/genres/:id', () => {
    test('returns genre with children', async () => {
      const res = await request.get('/api/v1/normalization/genres/genre-pop');
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Pop');
      expect(res.body.data.children).toBeInstanceOf(Array);
    });

    test('returns 404 for nonexistent genre', async () => {
      const res = await request.get('/api/v1/normalization/genres/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/normalization/moods', () => {
    test('returns canonical moods', async () => {
      const res = await request.get('/api/v1/normalization/moods');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data).toContain('Energetic');
    });
  });

  describe('GET /api/v1/normalization/keys', () => {
    test('returns canonical keys', async () => {
      const res = await request.get('/api/v1/normalization/keys');
      expect(res.status).toBe(200);
      expect(res.body.data).toContain('C Major');
      expect(res.body.data).toContain('F# Minor');
    });
  });

  describe('POST /api/v1/releases/:releaseId/normalize', () => {
    test('creates run and returns suggestions', async () => {
      const res = await request.post('/api/v1/releases/' + testReleaseId + '/normalize');
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('run');
      expect(res.body.data).toHaveProperty('suggestions');
      expect(res.body.data.run.status).toBe('completed');
      expect(res.body.data.suggestions.length).toBeGreaterThan(0);
    });

    test('returns 404 for nonexistent release', async () => {
      const res = await request.post('/api/v1/releases/nonexistent/normalize');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/releases/:releaseId/normalization', () => {
    test('returns latest suggestions', async () => {
      // Run first
      await request.post('/api/v1/releases/' + testReleaseId + '/normalize');
      const res = await request.get('/api/v1/releases/' + testReleaseId + '/normalization');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('run');
      expect(res.body.data).toHaveProperty('suggestions');
    });

    test('returns null for release with no runs', async () => {
      const newId = uuid();
      mockDb.prepare('INSERT INTO releases (id, title, release_type) VALUES (?, ?, ?)').run(newId, 'Clean', 'single');
      const res = await request.get('/api/v1/releases/' + newId + '/normalization');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  describe('PUT /api/v1/normalization/suggestions/:id/accept', () => {
    test('accepts a pending suggestion', async () => {
      const runRes = await request.post('/api/v1/releases/' + testReleaseId + '/normalize');
      const pending = runRes.body.data.suggestions.find(s => s.status === 'pending');
      if (pending) {
        const res = await request.put('/api/v1/normalization/suggestions/' + pending.id + '/accept');
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('accepted');
      }
    });

    test('returns 404 for nonexistent suggestion', async () => {
      const res = await request.put('/api/v1/normalization/suggestions/nonexistent/accept');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/normalization/suggestions/:id/reject', () => {
    test('rejects a pending suggestion', async () => {
      const runRes = await request.post('/api/v1/releases/' + testReleaseId + '/normalize');
      const pending = runRes.body.data.suggestions.find(s => s.status === 'pending');
      if (pending) {
        const res = await request.put('/api/v1/normalization/suggestions/' + pending.id + '/reject');
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('rejected');
      }
    });
  });

  describe('POST /api/v1/releases/:releaseId/normalization/accept-all', () => {
    test('accepts all pending suggestions', async () => {
      await request.post('/api/v1/releases/' + testReleaseId + '/normalize');
      const res = await request.post('/api/v1/releases/' + testReleaseId + '/normalization/accept-all');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accepted');
      expect(res.body.data.accepted).toBeGreaterThanOrEqual(0);
    });
  });
});
