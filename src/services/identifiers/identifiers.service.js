const repository = require('./identifiers.repository');
const eventsService = require('../events/events.service');
const { ConflictError, NotFoundError } = require('../../shared/errors/app.error');

const IDENTIFIER_TYPES = {
  ISRC: 'isrc',
  UPC: 'upc',
  ISWC: 'iswc',
  IPI: 'ipi',
  ISNI: 'isni',
  PRO_MEMBER_ID: 'pro_member_id'
};

module.exports = {
  IDENTIFIER_TYPES,

  assign(identifierType, identifierValue, entityType, entityId, options = {}) {
    // Check uniqueness
    if (repository.exists(identifierType, identifierValue)) {
      throw new ConflictError(`${identifierType.toUpperCase()} ${identifierValue} is already assigned`);
    }

    const identifier = repository.create({
      identifier_type: identifierType,
      identifier_value: identifierValue,
      entity_type: entityType,
      entity_id: entityId,
      source: options.source || 'manual',
      verified: options.verified || 0,
      issued_by: options.issuedBy || null
    });

    // Record event
    const eventType = identifierType === 'isrc'
      ? eventsService.EVENT_TYPES.ISRC_ASSIGNED
      : identifierType === 'upc'
      ? eventsService.EVENT_TYPES.UPC_ASSIGNED
      : 'identifier.assigned';

    eventsService.record(eventType, entityType, entityId, {
      identifier_id: identifier.id,
      identifier_type: identifierType,
      identifier_value: identifierValue
    });

    return identifier;
  },

  getForEntity(entityType, entityId) {
    return repository.findByEntity(entityType, entityId);
  },

  lookup(identifierType, identifierValue) {
    return repository.findByTypeAndValue(identifierType, identifierValue);
  },

  revoke(id, reason) {
    const existing = repository.findById(id);
    if (!existing) throw new NotFoundError('Identifier');
    return repository.revoke(id, reason);
  }
};
