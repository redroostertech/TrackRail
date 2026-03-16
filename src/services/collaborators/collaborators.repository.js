const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  findAll(search) {
    const db = getDb();
    if (search) {
      return db.prepare('SELECT * FROM collaborators WHERE name LIKE ? ORDER BY name ASC').all(`%${search}%`);
    }
    return db.prepare('SELECT * FROM collaborators ORDER BY name ASC').all();
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM collaborators WHERE id = ?').get(id);
  },

  create(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO collaborators (id, name, email, role, pro_affiliation, pro_member_id, ipi_number, publisher)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.name, data.email || null, data.role || 'songwriter',
      data.pro_affiliation || 'none', data.pro_member_id || null,
      data.ipi_number || null, data.publisher || null
    );
    return this.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const fields = [];
    const params = [];
    const allowed = ['name', 'email', 'role', 'pro_affiliation', 'pro_member_id', 'ipi_number', 'publisher'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (!fields.length) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE collaborators SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  remove(id) {
    getDb().prepare('DELETE FROM collaborators WHERE id = ?').run(id);
  }
};
