const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  findByRelease(releaseId) {
    return getDb().prepare('SELECT * FROM tracks WHERE release_id = ? ORDER BY track_number ASC').all(releaseId);
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  },

  create(data) {
    const db = getDb();
    const id = uuid();
    const trackNum = db.prepare('SELECT COALESCE(MAX(track_number), 0) + 1 as next FROM tracks WHERE release_id = ?').get(data.release_id).next;

    db.prepare(`INSERT INTO tracks (id, release_id, title, track_number, file_path, file_name, file_size, file_format, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.release_id, data.title, trackNum,
      data.file_path || null, data.file_name || null,
      data.file_size || null, data.file_format || null,
      data.duration_seconds || null
    );
    return this.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const fields = [];
    const params = [];
    const allowed = ['title', 'track_number', 'bpm', 'musical_key', 'genre', 'mood', 'energy', 'isrc_code', 'lyrics', 'explicit', 'ai_analyzed', 'duration_seconds'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (!fields.length) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE tracks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  remove(id) {
    getDb().prepare('DELETE FROM tracks WHERE id = ?').run(id);
  }
};
