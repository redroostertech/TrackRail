const repository = require('./releases.repository');
const { NotFoundError, ValidationError } = require('../../shared/errors/app.error');
const eventsService = require('../events/events.service');
const { EVENT_TYPES } = eventsService;

const VALID_STATUSES = ['draft', 'metadata', 'splits', 'copyright', 'pro', 'distribution', 'scheduled', 'released'];

module.exports = {
  findAll(filters) {
    return repository.findAll(filters);
  },

  findById(id) {
    const release = repository.findById(id);
    if (!release) throw new NotFoundError('Release');
    return release;
  },

  create(data) {
    const release = repository.create(data);
    eventsService.record(EVENT_TYPES.RELEASE_CREATED, 'release', release.id, {
      title: release.title, release_type: release.release_type
    });
    return release;
  },

  update(id, data) {
    this.findById(id);
    const release = repository.update(id, data);
    eventsService.record(EVENT_TYPES.RELEASE_UPDATED, 'release', id, { fields: Object.keys(data) });
    return release;
  },

  updateStatus(id, status) {
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError('Invalid status', [{ field: 'status', message: `Must be one of: ${VALID_STATUSES.join(', ')}` }]);
    }
    const prev = this.findById(id);
    const release = repository.updateStatus(id, status);
    eventsService.record(EVENT_TYPES.RELEASE_STATUS_CHANGED, 'release', id, {
      from: prev.status, to: status
    });
    return release;
  },

  remove(id) {
    const release = this.findById(id);
    repository.remove(id);
    eventsService.record(EVENT_TYPES.RELEASE_DELETED, 'release', id, { title: release.title });
  },

  getChecklist(id) {
    const { getDb } = require('../../database');
    const db = getDb();
    const release = this.findById(id);

    const tracks = db.prepare('SELECT COUNT(*) as count FROM tracks WHERE release_id = ?').get(id).count;
    const analyzedTracks = db.prepare('SELECT COUNT(*) as count FROM tracks WHERE release_id = ? AND ai_analyzed = 1').get(id).count;
    const tracksWithISRC = db.prepare('SELECT COUNT(*) as count FROM tracks WHERE release_id = ? AND isrc_code IS NOT NULL').get(id).count;

    const trackIds = db.prepare('SELECT id FROM tracks WHERE release_id = ?').all(id).map(t => t.id);
    let splitsComplete = 0;
    let copyrightsStarted = 0;
    let proStarted = 0;

    for (const tid of trackIds) {
      const splitSum = db.prepare('SELECT COALESCE(SUM(percentage), 0) as total FROM splits WHERE track_id = ?').get(tid).total;
      if (Math.abs(splitSum - 100) < 0.01) splitsComplete++;

      const cr = db.prepare("SELECT COUNT(*) as count FROM copyrights WHERE track_id = ? AND status != 'not_started'").get(tid).count;
      if (cr > 0) copyrightsStarted++;

      const pr = db.prepare("SELECT COUNT(*) as count FROM pro_registrations WHERE track_id = ? AND status != 'not_started'").get(tid).count;
      if (pr > 0) proStarted++;
    }

    const distributions = db.prepare("SELECT COUNT(*) as count FROM distributions WHERE release_id = ? AND status != 'not_submitted'").get(id).count;

    return {
      release,
      checklist: {
        tracks: { done: tracks > 0, count: tracks, label: 'Tracks uploaded' },
        metadata: { done: analyzedTracks === tracks && tracks > 0, count: `${analyzedTracks}/${tracks}`, label: 'AI metadata analyzed' },
        isrc: { done: tracksWithISRC === tracks && tracks > 0, count: `${tracksWithISRC}/${tracks}`, label: 'ISRC codes assigned' },
        splits: { done: splitsComplete === tracks && tracks > 0, count: `${splitsComplete}/${tracks}`, label: 'Split sheets complete' },
        copyright: { done: copyrightsStarted === tracks && tracks > 0, count: `${copyrightsStarted}/${tracks}`, label: 'Copyright filings started' },
        pro: { done: proStarted === tracks && tracks > 0, count: `${proStarted}/${tracks}`, label: 'PRO registrations started' },
        distribution: { done: distributions > 0, count: distributions, label: 'Distribution submitted' },
        releaseDate: { done: !!release.release_date, label: 'Release date set' }
      }
    };
  },

  getStats() {
    return repository.getStats();
  }
};
