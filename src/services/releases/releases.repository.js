const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  findAll(filters = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM releases';
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push('title LIKE ?');
      params.push(`%${filters.search}%`);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY ${filters.sort === 'title' ? 'title' : 'updated_at'} ${filters.order === 'asc' ? 'ASC' : 'DESC'}`;
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    return db.prepare(sql).all(...params);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM releases WHERE id = ?').get(id);
  },

  create(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO releases (id, title, release_type, status, genre, subgenre, label, release_date, description)
      VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)`).run(
      id, data.title, data.release_type || 'single',
      data.genre || null, data.subgenre || null, data.label || null,
      data.release_date || null, data.description || null
    );
    return this.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const fields = [];
    const params = [];
    const allowed = ['title', 'release_type', 'genre', 'subgenre', 'label', 'release_date', 'description', 'artwork_path', 'upc_code'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (!fields.length) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE releases SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  updateStatus(id, status) {
    getDb().prepare("UPDATE releases SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return this.findById(id);
  },

  remove(id) {
    getDb().prepare('DELETE FROM releases WHERE id = ?').run(id);
  },

  getStats() {
    const db = getDb();
    return {
      total: db.prepare('SELECT COUNT(*) as count FROM releases').get().count,
      byStatus: db.prepare('SELECT status, COUNT(*) as count FROM releases GROUP BY status').all(),
      totalTracks: db.prepare('SELECT COUNT(*) as count FROM tracks').get().count
    };
  }
};
