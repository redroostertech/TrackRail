const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  findByTrack(trackId) {
    return getDb().prepare('SELECT * FROM copyrights WHERE track_id = ? ORDER BY created_at DESC').all(trackId);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM copyrights WHERE id = ?').get(id);
  },

  findAll(filters = {}) {
    const db = getDb();
    let sql = `SELECT c.*, t.title as track_title, r.title as release_title
      FROM copyrights c
      JOIN tracks t ON c.track_id = t.id
      JOIN releases r ON t.release_id = r.id`;
    const conditions = [];
    const params = [];

    if (filters.status) { conditions.push('c.status = ?'); params.push(filters.status); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY c.created_at DESC';

    return db.prepare(sql).all(...params);
  },

  create(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO copyrights (id, track_id, copyright_type, claimant_name, author_name, year_completed, year_published, nation_first_publication)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.track_id, data.copyright_type || 'sr',
      data.claimant_name || null, data.author_name || null,
      data.year_completed || null, data.year_published || null,
      data.nation_first_publication || 'United States'
    );
    return this.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const fields = [];
    const params = [];
    const allowed = ['status', 'registration_number', 'claimant_name', 'author_name', 'year_completed', 'year_published', 'nation_first_publication', 'submitted_date', 'registered_date', 'notes'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (!fields.length) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE copyrights SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  }
};
