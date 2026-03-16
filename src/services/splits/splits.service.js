const repository = require('./splits.repository');
const aiService = require('../ai/ai.service');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors/app.error');

module.exports = {
  findByTrack(trackId) {
    return repository.findByTrack(trackId);
  },

  create(data) {
    // Check that adding this won't exceed 100%
    const currentTotal = repository.getTotal(data.track_id);
    if (currentTotal + data.percentage > 100.01) {
      throw new ConflictError(`Split would exceed 100%. Current total: ${currentTotal}%, trying to add ${data.percentage}%`);
    }
    return repository.create(data);
  },

  update(id, data) {
    const existing = repository.findById(id);
    if (!existing) throw new NotFoundError('Split');

    if (data.percentage !== undefined) {
      const currentTotal = repository.getTotal(existing.track_id);
      const newTotal = currentTotal - existing.percentage + data.percentage;
      if (newTotal > 100.01) {
        throw new ConflictError(`Split would exceed 100%. New total would be ${newTotal}%`);
      }
    }

    return repository.update(id, data);
  },

  remove(id) {
    const existing = repository.findById(id);
    if (!existing) throw new NotFoundError('Split');
    repository.remove(id);
  },

  validate(trackId) {
    const total = repository.getTotal(trackId);
    const splits = repository.findByTrack(trackId);
    const allAgreed = splits.every(s => s.agreed);
    return {
      total,
      valid: Math.abs(total - 100) < 0.01,
      allAgreed,
      splits
    };
  },

  async suggest(trackId) {
    const tracksRepo = require('../tracks/tracks.repository');
    const track = tracksRepo.findById(trackId);
    if (!track) throw new NotFoundError('Track');

    const { getDb } = require('../../database');
    const existingSplits = repository.findByTrack(trackId);
    const collabIds = existingSplits.map(s => s.collaborator_id);

    // Get collaborators for this track
    let collaborators;
    if (collabIds.length > 0) {
      const placeholders = collabIds.map(() => '?').join(',');
      collaborators = getDb().prepare(`SELECT * FROM collaborators WHERE id IN (${placeholders})`).all(...collabIds);
    } else {
      collaborators = getDb().prepare('SELECT * FROM collaborators ORDER BY created_at DESC LIMIT 5').all();
    }

    return aiService.suggestSplits(track, collaborators);
  },

  exportSheet(trackId) {
    const tracksRepo = require('../tracks/tracks.repository');
    const track = tracksRepo.findById(trackId);
    if (!track) throw new NotFoundError('Track');

    const splits = repository.findByTrack(trackId);
    const total = repository.getTotal(trackId);

    return {
      track: { id: track.id, title: track.title, isrc: track.isrc_code },
      splits: splits.map(s => ({
        name: s.collaborator_name,
        email: s.collaborator_email,
        role: s.role,
        percentage: s.percentage,
        pro: s.pro_affiliation,
        agreed: !!s.agreed,
        agreed_at: s.agreed_at
      })),
      total,
      valid: Math.abs(total - 100) < 0.01,
      generated_at: new Date().toISOString()
    };
  }
};
