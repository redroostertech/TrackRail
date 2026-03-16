const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  record(event) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO domain_events (id, event_type, entity_type, entity_id, actor_type, actor_id, payload, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id,
      event.event_type,
      event.entity_type,
      event.entity_id,
      event.actor_type || 'system',
      event.actor_id || null,
      event.payload ? JSON.stringify(event.payload) : null,
      event.metadata ? JSON.stringify(event.metadata) : null
    );
    return id;
  },

  findByEntity(entityType, entityId, limit = 50) {
    return getDb().prepare(`
      SELECT * FROM domain_events
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(entityType, entityId, limit);
  },

  findByType(eventType, limit = 50) {
    return getDb().prepare(`
      SELECT * FROM domain_events
      WHERE event_type = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(eventType, limit);
  },

  findRecent(limit = 100, offset = 0) {
    return getDb().prepare(`
      SELECT * FROM domain_events
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  },

  findByActor(actorId, limit = 50) {
    return getDb().prepare(`
      SELECT * FROM domain_events
      WHERE actor_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(actorId, limit);
  }
};
