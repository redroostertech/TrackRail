const repository = require('./analytics.repository');

module.exports = {
  getOverview() {
    return repository.getOverview();
  },

  getTrackStats(trackId) {
    return repository.getTrackStats(trackId);
  },

  getPlatformStats() {
    return repository.getPlatformStats();
  },

  seedData() {
    return repository.seedData();
  }
};
