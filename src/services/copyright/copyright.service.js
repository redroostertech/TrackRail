const repository = require('./copyright.repository');
const aiService = require('../ai/ai.service');
const { NotFoundError } = require('../../shared/errors/app.error');

module.exports = {
  findByTrack(trackId) {
    return repository.findByTrack(trackId);
  },

  findAll(filters) {
    return repository.findAll(filters);
  },

  findById(id) {
    const cr = repository.findById(id);
    if (!cr) throw new NotFoundError('Copyright registration');
    return cr;
  },

  create(data) {
    return repository.create(data);
  },

  update(id, data) {
    this.findById(id);
    return repository.update(id, data);
  },

  async prepareForm(trackId) {
    const tracksRepo = require('../tracks/tracks.repository');
    const track = tracksRepo.findById(trackId);
    if (!track) throw new NotFoundError('Track');

    const { getDb } = require('../../database');
    const artist = getDb().prepare('SELECT * FROM artist WHERE id = 1').get();

    const splits = getDb().prepare(`
      SELECT s.*, c.name as collaborator_name FROM splits s
      JOIN collaborators c ON s.collaborator_id = c.id
      WHERE s.track_id = ?
    `).all(trackId);

    const filing = await aiService.prepareCopyrightFiling(track, artist, splits);

    return {
      track: { id: track.id, title: track.title, isrc: track.isrc_code },
      filing,
      instructions: [
        'Review all fields for accuracy',
        'Ensure the deposit copy (audio file) is ready',
        'The artist must certify the information under penalty of perjury',
        'Filing fee: $65 for single work (online), $125 for standard application',
        'Submit at https://www.copyright.gov/registration/'
      ]
    };
  }
};
