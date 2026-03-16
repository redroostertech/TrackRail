const repository = require('./collaborators.repository');
const { NotFoundError } = require('../../shared/errors/app.error');

module.exports = {
  findAll(search) {
    return repository.findAll(search);
  },

  findById(id) {
    const collab = repository.findById(id);
    if (!collab) throw new NotFoundError('Collaborator');
    return collab;
  },

  create(data) {
    return repository.create(data);
  },

  update(id, data) {
    this.findById(id);
    return repository.update(id, data);
  },

  remove(id) {
    this.findById(id);
    repository.remove(id);
  }
};
