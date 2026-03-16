const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  findByRelease(releaseId) {
    return getDb().prepare('SELECT * FROM milestones WHERE release_id = ? ORDER BY sort_order ASC, due_date ASC').all(releaseId);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM milestones WHERE id = ?').get(id);
  },

  findAll(filters = {}) {
    const db = getDb();
    let sql = `SELECT m.*, r.title as release_title
      FROM milestones m
      JOIN releases r ON m.release_id = r.id`;
    const conditions = [];
    const params = [];

    if (filters.from) { conditions.push('m.due_date >= ?'); params.push(filters.from); }
    if (filters.to) { conditions.push('m.due_date <= ?'); params.push(filters.to); }
    if (filters.completed !== undefined) { conditions.push('m.completed = ?'); params.push(filters.completed === 'true' ? 1 : 0); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY m.due_date ASC, m.sort_order ASC';

    return db.prepare(sql).all(...params);
  },

  create(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO milestones (id, release_id, title, description, due_date, milestone_type, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.release_id, data.title, data.description || null,
      data.due_date, data.milestone_type || 'custom', data.sort_order || 0
    );
    return this.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const fields = [];
    const params = [];
    const allowed = ['title', 'description', 'due_date', 'milestone_type', 'sort_order', 'completed', 'completed_at'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (!fields.length) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE milestones SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  remove(id) {
    getDb().prepare('DELETE FROM milestones WHERE id = ?').run(id);
  }
};
