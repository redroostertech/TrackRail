const repository = require('./distribution.repository');
const { NotFoundError } = require('../../shared/errors/app.error');

const PLATFORMS = ['spotify', 'apple_music', 'amazon_music', 'tidal', 'deezer', 'youtube_music', 'soundcloud', 'bandcamp'];

module.exports = {
  findByRelease(releaseId) {
    return repository.findByRelease(releaseId);
  },

  findAll(filters) {
    return repository.findAll(filters);
  },

  create(data) {
    return repository.create(data);
  },

  update(id, data) {
    const existing = repository.findById(id);
    if (!existing) throw new NotFoundError('Distribution');
    return repository.update(id, data);
  },

  remove(id) {
    const existing = repository.findById(id);
    if (!existing) throw new NotFoundError('Distribution');
    repository.remove(id);
  },

  // Create entries for all major platforms at once
  createAll(releaseId, distributor) {
    const results = [];
    for (const platform of PLATFORMS) {
      results.push(repository.create({ release_id: releaseId, platform, distributor }));
    }
    return results;
  },

  getPlatforms() {
    return PLATFORMS;
  }
};
