const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  findByTrack(trackId) {
    return getDb().prepare('SELECT * FROM pro_registrations WHERE track_id = ? ORDER BY created_at DESC').all(trackId);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM pro_registrations WHERE id = ?').get(id);
  },

  findAll(filters = {}) {
    const db = getDb();
    let sql = `SELECT p.*, t.title as track_title, r.title as release_title
      FROM pro_registrations p
      JOIN tracks t ON p.track_id = t.id
      JOIN releases r ON t.release_id = r.id`;
    const conditions = [];
    const params = [];

    if (filters.status) { conditions.push('p.status = ?'); params.push(filters.status); }
    if (filters.pro_name) { conditions.push('p.pro_name = ?'); params.push(filters.pro_name); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY p.created_at DESC';

    return db.prepare(sql).all(...params);
  },

  create(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO pro_registrations (id, track_id, pro_name, status)
      VALUES (?, ?, ?, 'not_started')`).run(id, data.track_id, data.pro_name);
    return this.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const fields = [];
    const params = [];
    const allowed = ['status', 'work_id', 'submitted_date', 'registered_date', 'iswc_code', 'notes'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (!fields.length) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE pro_registrations SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  }
};
