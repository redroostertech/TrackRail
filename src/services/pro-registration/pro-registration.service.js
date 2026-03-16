const repository = require('./pro-registration.repository');
const { NotFoundError } = require('../../shared/errors/app.error');

module.exports = {
  findByTrack(trackId) {
    return repository.findByTrack(trackId);
  },

  findAll(filters) {
    return repository.findAll(filters);
  },

  findById(id) {
    const reg = repository.findById(id);
    if (!reg) throw new NotFoundError('PRO registration');
    return reg;
  },

  create(data) {
    return repository.create(data);
  },

  update(id, data) {
    this.findById(id);
    return repository.update(id, data);
  }
};
