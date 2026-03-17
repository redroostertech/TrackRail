const repository = require('./validation.repository');
const engine = require('./validation.engine');
const eventsService = require('../events/events.service');
const decisionsService = require('../decisions/decisions.service');
const releasesService = require('../releases/releases.service');
const tracksRepository = require('../tracks/tracks.repository');
const { NotFoundError } = require('../../shared/errors/app.error');

module.exports = {
  // ---- Rules ----

  getRules(filters) {
    const rules = repository.findAllRules(filters);
    return rules.map(parseRuleConfig);
  },

  getRuleById(id) {
    const rule = repository.findRuleById(id);
    if (!rule) throw new NotFoundError('Validation rule');
    return parseRuleConfig(rule);
  },

  updateRule(id, data) {
    const existing = repository.findRuleById(id);
    if (!existing) throw new NotFoundError('Validation rule');

    // Stringify rule_config if it's an object
    const updateData = { ...data };
    if (updateData.rule_config && typeof updateData.rule_config === 'object') {
      updateData.rule_config = JSON.stringify(updateData.rule_config);
    }

    const updated = repository.updateRule(id, updateData);
    eventsService.record('validation.rule_updated', 'validation_rule', id, { fields: Object.keys(data) });
    return parseRuleConfig(updated);
  },

  // ---- Validation Runs ----

  runValidation(releaseId) {
    // 1. Fetch release (throws NotFoundError if missing)
    const release = releasesService.findById(releaseId);

    // 2. Fetch tracks
    const tracks = tracksRepository.findByRelease(releaseId);

    // 3. Fetch all enabled rules
    const rules = repository.findEnabledRules();

    // 4. Run engine
    let engineResult;
    try {
      engineResult = engine.evaluateRelease(release, tracks, rules);
    } catch (err) {
      // Create failed run record
      const failedRun = repository.createRun({
        release_id: releaseId,
        status: 'failed',
        total_rules: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        infos: 0,
        score: 0
      });
      eventsService.record(eventsService.EVENT_TYPES.VALIDATION_RUN, 'release', releaseId, {
        run_id: failedRun.id,
        status: 'failed',
        error: err.message
      });
      throw err;
    }

    const { results, summary } = engineResult;

    // 5. Create run record
    const run = repository.createRun({
      release_id: releaseId,
      status: 'completed',
      total_rules: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      warnings: summary.warnings,
      infos: summary.infos,
      score: summary.score
    });

    // 6. Attach run_id to results and batch insert
    const resultsWithRun = results.map(r => ({ ...r, run_id: run.id }));
    if (resultsWithRun.length > 0) {
      repository.createResults(resultsWithRun);
    }

    // 7. Record event
    eventsService.record(eventsService.EVENT_TYPES.VALIDATION_RUN, 'release', releaseId, {
      run_id: run.id,
      score: summary.score,
      passed: summary.passed,
      failed: summary.failed,
      warnings: summary.warnings
    });

    // 8. Make decision via decisions engine
    const decisionRules = buildDecisionRules(results);
    const decision = decisionsService.decide(
      'release',
      releaseId,
      decisionsService.DECISION_TYPES.RELEASE_READINESS,
      {
        scores: { validation: summary.score },
        rules: decisionRules,
        decidedBy: 'validation_engine'
      }
    );

    // 9. Fetch full results with rule names for response
    const fullResults = repository.findResultsByRun(run.id);

    return { run, results: fullResults, decision };
  },

  getLatestResults(releaseId) {
    const run = repository.findLatestRun(releaseId);
    if (!run) return null;

    const results = repository.findResultsByRun(run.id);
    const decision = decisionsService.getLatest('release', releaseId, decisionsService.DECISION_TYPES.RELEASE_READINESS);

    return { run, results, decision };
  },

  getRunHistory(releaseId) {
    return repository.findRunsByRelease(releaseId);
  },

  acknowledgeResult(id) {
    const existing = repository.findResultById(id);
    if (!existing) throw new NotFoundError('Validation result');
    return repository.acknowledgeResult(id);
  }
};

// ---- Helpers ----

function parseRuleConfig(rule) {
  if (rule && rule.rule_config && typeof rule.rule_config === 'string') {
    try {
      return { ...rule, rule_config: JSON.parse(rule.rule_config) };
    } catch {
      return rule;
    }
  }
  return rule;
}

/**
 * Build decision adapter rules that conform to the decisions engine interface.
 * The decide() method expects: { id, severity, evaluate(scores) } → { passed, reason_code, reason_text }
 */
function buildDecisionRules(validationResults) {
  const hasErrors = validationResults.some(r => r.status === 'fail');
  const hasWarnings = validationResults.some(r => r.status === 'warning');
  const errorCount = validationResults.filter(r => r.status === 'fail').length;
  const warningCount = validationResults.filter(r => r.status === 'warning').length;

  const rules = [];

  if (hasErrors) {
    rules.push({
      id: 'validation_errors_present',
      severity: 'error',
      evaluate() {
        return {
          passed: false,
          reason_code: 'VALIDATION_ERRORS',
          reason_text: 'Release has ' + errorCount + ' validation error(s) that must be fixed'
        };
      }
    });
  }

  if (hasWarnings) {
    rules.push({
      id: 'validation_warnings_present',
      severity: 'warning',
      evaluate() {
        return {
          passed: false,
          reason_code: 'VALIDATION_WARNINGS',
          reason_text: 'Release has ' + warningCount + ' validation warning(s) to review'
        };
      }
    });
  }

  if (!hasErrors && !hasWarnings) {
    rules.push({
      id: 'validation_all_passed',
      severity: 'info',
      evaluate() {
        return { passed: true };
      }
    });
  }

  return rules;
}
