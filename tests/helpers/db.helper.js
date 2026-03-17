const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const MIGRATIONS_DIR = path.join(__dirname, '../../src/migrations');

let testDb;

function createTestDb() {
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = ON');

  // Run all migrations
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    testDb.exec(sql);
  }

  return testDb;
}

function getTestDb() {
  if (!testDb) createTestDb();
  return testDb;
}

function closeTestDb() {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

/**
 * Mock the database module so all services use our test database.
 * Call this in beforeAll() of tests that need the database.
 */
function mockDatabase() {
  const db = createTestDb();
  jest.mock('../../src/database', () => ({
    getDb: () => db,
    initialize: jest.fn()
  }));
  return db;
}

/**
 * Seed a test release with optional tracks.
 */
function seedRelease(db, overrides = {}) {
  const { v4: uuid } = require('uuid');
  const id = overrides.id || uuid();
  db.prepare(`INSERT INTO releases (id, title, release_type, status, genre, release_date, artwork_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    overrides.title || 'Test Release',
    overrides.release_type || 'single',
    overrides.status || 'draft',
    overrides.genre || null,
    overrides.release_date || null,
    overrides.artwork_path || null
  );
  return db.prepare('SELECT * FROM releases WHERE id = ?').get(id);
}

function seedTrack(db, releaseId, overrides = {}) {
  const { v4: uuid } = require('uuid');
  const id = overrides.id || uuid();
  db.prepare(`INSERT INTO tracks (id, release_id, title, track_number, file_path, file_name, genre, isrc_code, bpm, duration_seconds, explicit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, releaseId,
    overrides.title || 'Test Track',
    overrides.track_number || 1,
    overrides.file_path || null,
    overrides.file_name || null,
    overrides.genre || null,
    overrides.isrc_code || null,
    overrides.bpm || null,
    overrides.duration_seconds || null,
    overrides.explicit !== undefined ? overrides.explicit : null
  );
  return db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
}

module.exports = { createTestDb, getTestDb, closeTestDb, mockDatabase, seedRelease, seedTrack };
