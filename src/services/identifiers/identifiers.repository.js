const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  findByEntity(entityType, entityId) {
    return getDb().prepare(`
      SELECT * FROM identifiers
      WHERE entity_type = ? AND entity_id = ? AND revoked = 0
      ORDER BY identifier_type ASC
    `).all(entityType, entityId);
  },

  findByTypeAndValue(identifierType, identifierValue) {
    return getDb().prepare(`
      SELECT * FROM identifiers
      WHERE identifier_type = ? AND identifier_value = ?
    `).get(identifierType, identifierValue);
  },

  create(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO identifiers (id, identifier_type, identifier_value, entity_type, entity_id, source, verified, issued_at, issued_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`).run(
      id,
      data.identifier_type,
      data.identifier_value,
      data.entity_type,
      data.entity_id,
      data.source || 'manual',
      data.verified || 0,
      data.issued_by || null
    );
    return this.findById(id);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM identifiers WHERE id = ?').get(id);
  },

  revoke(id, reason) {
    getDb().prepare(`UPDATE identifiers SET revoked = 1, revocation_reason = ?, updated_at = datetime('now') WHERE id = ?`).run(reason, id);
    return this.findById(id);
  },

  exists(identifierType, identifierValue) {
    return !!getDb().prepare(`SELECT 1 FROM identifiers WHERE identifier_type = ? AND identifier_value = ? AND revoked = 0`).get(identifierType, identifierValue);
  }
};
