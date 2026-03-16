const repository = require('./calendar.repository');
const aiService = require('../ai/ai.service');
const { NotFoundError } = require('../../shared/errors/app.error');

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
    if (!existing) throw new NotFoundError('Milestone');
    return repository.update(id, data);
  },

  complete(id) {
    const existing = repository.findById(id);
    if (!existing) throw new NotFoundError('Milestone');
    return repository.update(id, { completed: 1, completed_at: new Date().toISOString() });
  },

  uncomplete(id) {
    const existing = repository.findById(id);
    if (!existing) throw new NotFoundError('Milestone');
    return repository.update(id, { completed: 0, completed_at: null });
  },

  remove(id) {
    const existing = repository.findById(id);
    if (!existing) throw new NotFoundError('Milestone');
    repository.remove(id);
  },

  async generate(releaseId) {
    const releasesRepo = require('../releases/releases.repository');
    const release = releasesRepo.findById(releaseId);
    if (!release) throw new NotFoundError('Release');

    const releaseDate = release.release_date || aiService.suggestReleaseDate();
    const milestones = await aiService.generateMilestones(releaseDate, release.release_type);

    const results = [];
    for (const m of milestones) {
      results.push(repository.create({
        release_id: releaseId,
        title: m.title,
        description: m.description,
        due_date: m.due_date,
        milestone_type: m.milestone_type,
        sort_order: m.sort_order
      }));
    }
    return results;
  }
};
