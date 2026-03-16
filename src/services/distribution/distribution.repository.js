const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  findByRelease(releaseId) {
    return getDb().prepare('SELECT * FROM distributions WHERE release_id = ? ORDER BY platform ASC').all(releaseId);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM distributions WHERE id = ?').get(id);
  },

  findAll(filters = {}) {
    const db = getDb();
    let sql = `SELECT d.*, r.title as release_title
      FROM distributions d
      JOIN releases r ON d.release_id = r.id`;
    const conditions = [];
    const params = [];

    if (filters.status) { conditions.push('d.status = ?'); params.push(filters.status); }
    if (filters.platform) { conditions.push('d.platform = ?'); params.push(filters.platform); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY d.created_at DESC';

    return db.prepare(sql).all(...params);
  },

  create(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO distributions (id, release_id, platform, distributor, status)
      VALUES (?, ?, ?, ?, 'not_submitted')`).run(id, data.release_id, data.platform, data.distributor || null);
    return this.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const fields = [];
    const params = [];
    const allowed = ['status', 'distributor', 'submitted_date', 'live_date', 'external_url', 'external_id', 'notes'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (!fields.length) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE distributions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  remove(id) {
    getDb().prepare('DELETE FROM distributions WHERE id = ?').run(id);
  }
};
