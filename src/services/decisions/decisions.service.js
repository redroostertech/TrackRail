const repository = require('./decisions.repository');
const eventsService = require('../events/events.service');
const { NotFoundError } = require('../../shared/errors/app.error');

const DECISION_TYPES = {
  RELEASE_READINESS: 'release_readiness',
  DISTRIBUTION_APPROVAL: 'distribution_approval',
  FRAUD_REVIEW: 'fraud_review',
  QUALITY_GATE: 'quality_gate'
};

const OUTCOMES = {
  APPROVED: 'approved',
  FLAGGED: 'flagged',
  BLOCKED: 'blocked',
  PENDING_REVIEW: 'pending_review'
};

module.exports = {
  DECISION_TYPES,
  OUTCOMES,

  // Make a decision based on scores + rules
  decide(entityType, entityId, decisionType, { scores, rules, decidedBy } = {}) {
    // This is the decision engine entry point.
    // Scores measure. This function decides.
    // Rules are evaluated against scores to produce an outcome.

    let outcome = OUTCOMES.APPROVED;
    let reasonCode = null;
    let reasonText = null;
    const appliedRules = [];

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const result = rule.evaluate(scores);
        appliedRules.push({ rule_id: rule.id, passed: result.passed });

        if (!result.passed) {
          if (rule.severity === 'error') {
            outcome = OUTCOMES.BLOCKED;
            reasonCode = result.reason_code;
            reasonText = result.reason_text;
            break; // First blocking rule wins
          } else if (rule.severity === 'warning' && outcome !== OUTCOMES.BLOCKED) {
            outcome = OUTCOMES.FLAGGED;
            reasonCode = result.reason_code;
            reasonText = result.reason_text;
          }
        }
      }
    }

    const decision = repository.create({
      entity_type: entityType,
      entity_id: entityId,
      decision_type: decisionType,
      outcome,
      reason_code: reasonCode,
      reason_text: reasonText,
      score_snapshot: scores,
      rules_applied: appliedRules,
      decided_by: decidedBy || 'system'
    });

    // Record event
    eventsService.record(
      eventsService.EVENT_TYPES.DECISION_MADE,
      entityType, entityId,
      { decision_id: decision.id, outcome, reason_code: reasonCode }
    );

    return decision;
  },

  // Simple decision without rules engine (direct outcome)
  record(entityType, entityId, decisionType, outcome, reason, scores) {
    return repository.create({
      entity_type: entityType,
      entity_id: entityId,
      decision_type: decisionType,
      outcome,
      reason_code: reason,
      reason_text: reason,
      score_snapshot: scores,
      decided_by: 'system'
    });
  },

  getLatest(entityType, entityId, decisionType) {
    return repository.findLatest(entityType, entityId, decisionType);
  },

  getHistory(entityType, entityId) {
    return repository.findByEntity(entityType, entityId);
  },

  override(id, overriddenBy, reason) {
    const decision = repository.findById(id);
    if (!decision) throw new NotFoundError('Decision');

    const updated = repository.override(id, { overridden_by: overriddenBy, override_reason: reason });

    eventsService.record(
      eventsService.EVENT_TYPES.DECISION_OVERRIDDEN,
      decision.entity_type, decision.entity_id,
      { decision_id: id, original_outcome: decision.outcome, override_reason: reason }
    );

    return updated;
  }
};
