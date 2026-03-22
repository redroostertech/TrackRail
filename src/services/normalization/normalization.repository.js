const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  // ---- Genre Taxonomy ----

  findAllGenres(filters = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM genre_taxonomy';
    const conditions = [];
    const params = [];

    if (filters.level !== undefined && filters.level !== '') {
      conditions.push('level = ?');
      params.push(Number(filters.level));
    }
    if (filters.parent_id) {
      conditions.push('parent_id = ?');
      params.push(filters.parent_id);
    }
    if (filters.search) {
      conditions.push('(name LIKE ? OR aliases LIKE ?)');
      params.push('%' + filters.search + '%', '%' + filters.search + '%');
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY sort_order ASC, name ASC';

    return db.prepare(sql).all(...params);
  },

  findGenreById(id) {
    return getDb().prepare('SELECT * FROM genre_taxonomy WHERE id = ?').get(id);
  },

  findGenreChildren(parentId) {
    return getDb().prepare('SELECT * FROM genre_taxonomy WHERE parent_id = ? ORDER BY sort_order ASC, name ASC').all(parentId);
  },

  findGenreByName(name) {
    return getDb().prepare('SELECT * FROM genre_taxonomy WHERE LOWER(name) = LOWER(?)').get(name);
  },

  findAllGenresFlat() {
    return getDb().prepare('SELECT * FROM genre_taxonomy ORDER BY level ASC, sort_order ASC, name ASC').all();
  },

  // ---- Normalization Runs ----

  createRun(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO normalization_runs (id, release_id, status, total_suggestions, accepted, rejected, pending)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.release_id, data.status || 'completed',
      data.total_suggestions || 0, data.accepted || 0,
      data.rejected || 0, data.pending || 0
    );
    return this.findRunById(id);
  },

  findRunById(id) {
    return getDb().prepare('SELECT * FROM normalization_runs WHERE id = ?').get(id);
  },

  findLatestRun(releaseId) {
    return getDb().prepare('SELECT * FROM normalization_runs WHERE release_id = ? ORDER BY run_at DESC LIMIT 1').get(releaseId);
  },

  findRunsByRelease(releaseId, limit = 20) {
    return getDb().prepare('SELECT * FROM normalization_runs WHERE release_id = ? ORDER BY run_at DESC LIMIT ?').all(releaseId, limit);
  },

  updateRunCounts(runId) {
    const db = getDb();
    const counts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM normalization_suggestions WHERE run_id = ?
    `).get(runId);

    db.prepare(`UPDATE normalization_runs
      SET total_suggestions = ?, accepted = ?, rejected = ?, pending = ?
      WHERE id = ?`).run(counts.total, counts.accepted, counts.rejected, counts.pending, runId);

    return this.findRunById(runId);
  },

  // ---- Normalization Suggestions ----

  createSuggestions(suggestions) {
    const db = getDb();
    const insert = db.prepare(`INSERT INTO normalization_suggestions
      (id, run_id, release_id, track_id, field_path, original_value, normalized_value, rule_applied, confidence, reasoning)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    const insertMany = db.transaction(function (items) {
      for (const s of items) {
        insert.run(
          uuid(), s.run_id, s.release_id, s.track_id || null,
          s.field_path, s.original_value || null,
          s.normalized_value, s.rule_applied,
          s.confidence || 1.0, s.reasoning || null
        );
      }
    });

    insertMany(suggestions);
  },

  findSuggestionsByRun(runId) {
    return getDb().prepare(`
      SELECT * FROM normalization_suggestions
      WHERE run_id = ?
      ORDER BY
        CASE status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 WHEN 'rejected' THEN 2 END,
        field_path ASC
    `).all(runId);
  },

  findSuggestionById(id) {
    return getDb().prepare('SELECT * FROM normalization_suggestions WHERE id = ?').get(id);
  },

  findPendingSuggestions(runId) {
    return getDb().prepare("SELECT * FROM normalization_suggestions WHERE run_id = ? AND status = 'pending' ORDER BY field_path ASC").all(runId);
  },

  updateSuggestionStatus(id, status) {
    const db = getDb();
    const timeField = status === 'accepted' ? 'accepted_at' : 'rejected_at';
    db.prepare('UPDATE normalization_suggestions SET status = ?, ' + timeField + " = datetime('now') WHERE id = ?").run(status, id);
    return this.findSuggestionById(id);
  }
};
