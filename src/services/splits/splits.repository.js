const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  findByTrack(trackId) {
    return getDb().prepare(`
      SELECT s.*, c.name as collaborator_name, c.email as collaborator_email, c.pro_affiliation
      FROM splits s
      JOIN collaborators c ON s.collaborator_id = c.id
      WHERE s.track_id = ?
      ORDER BY s.percentage DESC
    `).all(trackId);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM splits WHERE id = ?').get(id);
  },

  create(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO splits (id, track_id, collaborator_id, role, percentage)
      VALUES (?, ?, ?, ?, ?)`).run(id, data.track_id, data.collaborator_id, data.role, data.percentage);
    return this.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const fields = [];
    const params = [];

    if (data.percentage !== undefined) { fields.push('percentage = ?'); params.push(data.percentage); }
    if (data.role !== undefined) { fields.push('role = ?'); params.push(data.role); }
    if (data.agreed !== undefined) {
      fields.push('agreed = ?');
      params.push(data.agreed);
      if (data.agreed) fields.push("agreed_at = datetime('now')");
    }

    if (!fields.length) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE splits SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  remove(id) {
    getDb().prepare('DELETE FROM splits WHERE id = ?').run(id);
  },

  getTotal(trackId) {
    return getDb().prepare('SELECT COALESCE(SUM(percentage), 0) as total FROM splits WHERE track_id = ?').get(trackId).total;
  }
};
