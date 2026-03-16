const repository = require('./events.repository');

// Event type constants
const EVENT_TYPES = {
  // Release lifecycle
  RELEASE_CREATED: 'release.created',
  RELEASE_UPDATED: 'release.updated',
  RELEASE_STATUS_CHANGED: 'release.status_changed',
  RELEASE_DELETED: 'release.deleted',

  // Track lifecycle
  TRACK_UPLOADED: 'track.uploaded',
  TRACK_UPDATED: 'track.updated',
  TRACK_DELETED: 'track.deleted',
  TRACK_ANALYZED: 'track.ai_analyzed',

  // Identifiers
  ISRC_ASSIGNED: 'identifier.isrc_assigned',
  UPC_ASSIGNED: 'identifier.upc_assigned',

  // Collaborators & splits
  COLLABORATOR_ADDED: 'collaborator.added',
  COLLABORATOR_REMOVED: 'collaborator.removed',
  SPLIT_ADDED: 'split.added',
  SPLIT_UPDATED: 'split.updated',
  SPLIT_REMOVED: 'split.removed',

  // Rights & documents
  COPYRIGHT_CREATED: 'copyright.created',
  COPYRIGHT_STATUS_CHANGED: 'copyright.status_changed',
  COPYRIGHT_FILING_PREPARED: 'copyright.filing_prepared',
  PRO_REGISTRATION_CREATED: 'pro.registration_created',
  PRO_STATUS_CHANGED: 'pro.status_changed',
  DOCUMENT_GENERATED: 'document.generated',

  // Validation & quality
  VALIDATION_RUN: 'validation.run',
  NORMALIZATION_RUN: 'normalization.run',
  NORMALIZATION_ACCEPTED: 'normalization.accepted',
  QUALITY_SCORE_COMPUTED: 'quality.score_computed',

  // Distribution
  DISTRIBUTION_SUBMITTED: 'distribution.submitted',
  DISTRIBUTION_STATUS_CHANGED: 'distribution.status_changed',
  DELIVERY_ATTEMPTED: 'delivery.attempted',
  DELIVERY_CONFIRMED: 'delivery.confirmed',
  TAKEDOWN_REQUESTED: 'distribution.takedown_requested',

  // Royalties
  STATEMENT_IMPORTED: 'royalty.statement_imported',
  CALCULATION_RUN: 'royalty.calculation_run',
  DISPUTE_OPENED: 'royalty.dispute_opened',
  PAYOUT_REQUESTED: 'royalty.payout_requested',

  // Decisions
  DECISION_MADE: 'decision.made',
  DECISION_OVERRIDDEN: 'decision.overridden'
};

module.exports = {
  EVENT_TYPES,

  record(eventType, entityType, entityId, payload, options = {}) {
    return repository.record({
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      actor_type: options.actorType || 'system',
      actor_id: options.actorId || null,
      payload,
      metadata: options.metadata || null
    });
  },

  getEntityHistory(entityType, entityId, limit) {
    return repository.findByEntity(entityType, entityId, limit);
  },

  getByType(eventType, limit) {
    return repository.findByType(eventType, limit);
  },

  getRecent(limit, offset) {
    return repository.findRecent(limit, offset);
  }
};
