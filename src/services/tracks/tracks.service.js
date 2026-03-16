const repository = require('./tracks.repository');
const aiService = require('../ai/ai.service');
const { NotFoundError } = require('../../shared/errors/app.error');
const eventsService = require('../events/events.service');
const { EVENT_TYPES } = eventsService;

module.exports = {
  findByRelease(releaseId) {
    return repository.findByRelease(releaseId);
  },

  findById(id) {
    const track = repository.findById(id);
    if (!track) throw new NotFoundError('Track');
    return track;
  },

  create(data) {
    const track = repository.create(data);
    eventsService.record(EVENT_TYPES.TRACK_UPLOADED, 'track', track.id, {
      title: track.title, release_id: track.release_id, file_name: track.file_name, file_format: track.file_format
    });
    return track;
  },

  update(id, data) {
    this.findById(id);
    const track = repository.update(id, data);
    eventsService.record(EVENT_TYPES.TRACK_UPDATED, 'track', id, { fields: Object.keys(data) });
    return track;
  },

  remove(id) {
    const track = this.findById(id);
    repository.remove(id);
    eventsService.record(EVENT_TYPES.TRACK_DELETED, 'track', id, { title: track.title });
  },

  async analyze(id) {
    const track = this.findById(id);
    const analysis = await aiService.analyzeTrack(track.title, track.file_name, track.lyrics);
    const updated = repository.update(id, {
      bpm: analysis.bpm,
      musical_key: analysis.musical_key,
      genre: analysis.genre,
      mood: analysis.mood,
      energy: analysis.energy,
      ai_analyzed: 1
    });
    eventsService.record(EVENT_TYPES.TRACK_ANALYZED, 'track', id, {
      bpm: analysis.bpm, key: analysis.musical_key, genre: analysis.genre, mood: analysis.mood
    });
    return updated;
  },

  assignISRC(id) {
    this.findById(id);
    const isrc = aiService.generateISRC();
    const track = repository.update(id, { isrc_code: isrc });
    eventsService.record(EVENT_TYPES.ISRC_ASSIGNED, 'track', id, { isrc_code: isrc });
    return track;
  }
};
