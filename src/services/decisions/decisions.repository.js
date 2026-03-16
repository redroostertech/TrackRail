const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  create(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO decisions (id, entity_type, entity_id, decision_type, outcome, reason_code, reason_text, score_snapshot, rules_applied, decided_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id,
      data.entity_type,
      data.entity_id,
      data.decision_type,
      data.outcome,
      data.reason_code || null,
      data.reason_text || null,
      data.score_snapshot ? JSON.stringify(data.score_snapshot) : null,
      data.rules_applied ? JSON.stringify(data.rules_applied) : null,
      data.decided_by || 'system'
    );
    return this.findById(id);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM decisions WHERE id = ?').get(id);
  },

  findLatest(entityType, entityId, decisionType) {
    return getDb().prepare(`
      SELECT * FROM decisions
      WHERE entity_type = ? AND entity_id = ? AND decision_type = ?
      ORDER BY decided_at DESC
      LIMIT 1
    `).get(entityType, entityId, decisionType);
  },

  findByEntity(entityType, entityId) {
    return getDb().prepare(`
      SELECT * FROM decisions
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY decided_at DESC
    `).all(entityType, entityId);
  },

  override(id, data) {
    getDb().prepare(`
      UPDATE decisions
      SET overridden = 1, overridden_by = ?, overridden_at = datetime('now'), override_reason = ?
      WHERE id = ?
    `).run(data.overridden_by, data.override_reason, id);
    return this.findById(id);
  }
};
