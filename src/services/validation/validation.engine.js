/**
 * TrackRail Validation Engine
 *
 * Pure function module — no HTTP, no database.
 * Receives data and rules, returns evaluation results.
 */

/**
 * Evaluate a release and its tracks against a set of validation rules.
 *
 * @param {Object} release - Release object from database
 * @param {Array} tracks - Array of track objects for this release
 * @param {Array} rules - Array of enabled validation rule objects (with parsed rule_config)
 * @returns {{ results: Array, summary: { total: number, passed: number, failed: number, warnings: number, infos: number, skipped: number, score: number } }}
 */
function evaluateRelease(release, tracks, rules) {
  const results = [];

  const releaseRules = rules.filter(r => r.scope === 'release');
  const trackRules = rules.filter(r => r.scope === 'track');

  const context = {
    releaseStatus: release.status,
    trackCount: tracks.length
  };

  // Evaluate release-level rules
  for (const rule of releaseRules) {
    const result = evaluateRule(rule, release, null, 0, context);
    results.push(result);
  }

  // Evaluate track-level rules against each track
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    for (const rule of trackRules) {
      const result = evaluateRule(rule, release, track, i, context);
      results.push(result);
    }
  }

  // Compute summary
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  let infos = 0;
  let skipped = 0;

  for (const r of results) {
    switch (r.status) {
      case 'pass': passed++; break;
      case 'fail': failed++; break;
      case 'warning': warnings++; break;
      case 'info': infos++; break;
      case 'skipped': skipped++; break;
    }
  }

  const totalApplicable = results.length - skipped;
  const score = totalApplicable > 0 ? Math.round((passed / totalApplicable) * 100) : 100;

  return {
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      warnings,
      infos,
      skipped,
      score
    }
  };
}

/**
 * Evaluate a single rule against a release or track.
 */
function evaluateRule(rule, release, track, trackIndex, context) {
  const config = parseConfig(rule.rule_config);
  const entity = track || release;
  const fieldValue = rule.field_path ? entity[rule.field_path] : undefined;

  const fieldPath = computeFieldPath(rule, trackIndex, track);

  let evaluation;
  switch (rule.rule_type) {
    case 'required':
      evaluation = evaluateRequired(fieldValue, config, rule, context);
      break;
    case 'format':
      evaluation = evaluateFormat(fieldValue, config, rule, context);
      break;
    case 'range':
      evaluation = evaluateRange(fieldValue, config, rule, context);
      break;
    case 'custom':
      evaluation = evaluateCustom(fieldValue, config, rule, context);
      break;
    default:
      evaluation = { passed: true, message: 'Unknown rule type, skipped', status: 'skipped', resultCode: 'UNKNOWN_RULE_TYPE' };
  }

  const status = evaluation.status || mapStatus(evaluation.passed, rule.severity);

  return {
    rule_id: rule.id,
    release_id: release.id,
    track_id: track ? track.id : null,
    rule_key: rule.rule_key,
    status,
    severity: rule.severity,
    field_path: fieldPath,
    actual_value: fieldValue,
    message: evaluation.message,
    suggested_fix: evaluation.passed ? null : (rule.suggested_fix || null),
    result_code: evaluation.resultCode
  };
}

// ---- Rule Type Handlers ----

function evaluateRequired(value, config, rule, context) {
  const isEmpty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
  const fieldName = formatFieldName(rule.field_path || rule.rule_key);

  if (isEmpty) {
    return {
      passed: false,
      message: fieldName + ' is required',
      resultCode: buildResultCode(rule.rule_key, 'REQUIRED')
    };
  }

  return {
    passed: true,
    message: fieldName + ' is present',
    resultCode: buildResultCode(rule.rule_key, 'PRESENT')
  };
}

function evaluateFormat(value, config, rule, context) {
  // Skip if value is null/empty — required rule handles that
  if (value === null || value === undefined || value === '') {
    return { passed: true, message: 'No value to check format', status: 'skipped', resultCode: buildResultCode(rule.rule_key, 'SKIPPED') };
  }

  const check = config.check || 'not_all_caps';

  if (check === 'not_all_caps') {
    return evaluateNotAllCaps(String(value), config, rule);
  }

  return { passed: true, message: 'Unknown format check, skipped', status: 'skipped', resultCode: 'UNKNOWN_FORMAT_CHECK' };
}

function evaluateNotAllCaps(value, config, rule) {
  // Check if the string has alphabetic characters and all of them are uppercase
  let hasAlpha = false;
  let allUpper = true;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    const lower = ch.toLowerCase();
    const upper = ch.toUpperCase();
    if (lower !== upper) {
      // This character is alphabetic
      hasAlpha = true;
      if (ch !== upper) {
        allUpper = false;
        break;
      }
    }
  }

  if (!hasAlpha) {
    // No alphabetic chars (numbers, symbols only) — pass
    return { passed: true, message: 'No alphabetic characters to check', resultCode: buildResultCode(rule.rule_key, 'PASS') };
  }

  if (!allUpper) {
    // Not all caps — pass
    return { passed: true, message: 'Title is properly formatted', resultCode: buildResultCode(rule.rule_key, 'PASS') };
  }

  // All caps detected — check single word exception
  if (config.allow_single_word) {
    const words = value.split(' ').filter(w => w.length > 0);
    if (words.length <= 1) {
      return { passed: true, message: 'Single word title in all caps is acceptable', resultCode: buildResultCode(rule.rule_key, 'PASS') };
    }
  }

  const fieldName = formatFieldName(rule.field_path || rule.rule_key);
  return {
    passed: false,
    message: fieldName + ' should not be in all caps',
    resultCode: buildResultCode(rule.rule_key, 'ALL_CAPS')
  };
}

function evaluateRange(value, config, rule, context) {
  if ((value === null || value === undefined) && config.skip_if_null) {
    return { passed: true, message: 'No value set, skipping range check', status: 'skipped', resultCode: buildResultCode(rule.rule_key, 'SKIPPED') };
  }

  if (value === null || value === undefined) {
    const fieldName = formatFieldName(rule.field_path || rule.rule_key);
    return {
      passed: false,
      message: fieldName + ' is not set',
      resultCode: buildResultCode(rule.rule_key, 'NOT_SET')
    };
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return {
      passed: false,
      message: formatFieldName(rule.field_path) + ' is not a valid number',
      resultCode: buildResultCode(rule.rule_key, 'INVALID_NUMBER')
    };
  }

  if (config.min !== undefined && numValue < config.min) {
    return {
      passed: false,
      message: formatFieldName(rule.field_path) + ' is ' + numValue + ', must be at least ' + config.min,
      resultCode: buildResultCode(rule.rule_key, 'BELOW_MIN')
    };
  }

  if (config.max !== undefined && numValue > config.max) {
    return {
      passed: false,
      message: formatFieldName(rule.field_path) + ' is ' + numValue + ', must be at most ' + config.max,
      resultCode: buildResultCode(rule.rule_key, 'ABOVE_MAX')
    };
  }

  return {
    passed: true,
    message: formatFieldName(rule.field_path) + ' is within range',
    resultCode: buildResultCode(rule.rule_key, 'PASS')
  };
}

function evaluateCustom(value, config, rule, context) {
  const condition = config.condition;

  if (!condition) {
    return { passed: true, message: 'No condition specified', status: 'skipped', resultCode: 'NO_CONDITION' };
  }

  switch (condition) {
    case 'future_date':
      return evaluateFutureDate(value, config, rule, context);
    case 'explicitly_set':
      return evaluateExplicitlySet(value, config, rule, context);
    case 'min_count':
      return evaluateMinCount(value, config, rule, context);
    default:
      return { passed: true, message: 'Unknown condition: ' + condition, status: 'skipped', resultCode: 'UNKNOWN_CONDITION' };
  }
}

function evaluateFutureDate(value, config, rule, context) {
  // Skip for certain statuses (e.g. already released)
  if (config.skip_if_status && config.skip_if_status.includes(context.releaseStatus)) {
    return { passed: true, message: 'Skipped for ' + context.releaseStatus + ' releases', status: 'skipped', resultCode: buildResultCode(rule.rule_key, 'SKIPPED') };
  }

  if (!value) {
    return {
      passed: false,
      message: 'Release date is not set',
      resultCode: buildResultCode(rule.rule_key, 'NOT_SET')
    };
  }

  const releaseDate = new Date(value);
  if (isNaN(releaseDate.getTime())) {
    return {
      passed: false,
      message: 'Release date is not a valid date',
      resultCode: buildResultCode(rule.rule_key, 'INVALID_DATE')
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (releaseDate <= today) {
    return {
      passed: false,
      message: 'Release date must be in the future',
      resultCode: buildResultCode(rule.rule_key, 'NOT_FUTURE')
    };
  }

  return {
    passed: true,
    message: 'Release date is in the future',
    resultCode: buildResultCode(rule.rule_key, 'PASS')
  };
}

function evaluateExplicitlySet(value, config, rule, context) {
  // explicit field: 0 = not explicit (valid), 1 = explicit (valid), null = never set
  if (value === null || value === undefined) {
    return {
      passed: false,
      message: formatFieldName(rule.field_path) + ' has not been explicitly set',
      resultCode: buildResultCode(rule.rule_key, 'NOT_SET')
    };
  }

  return {
    passed: true,
    message: formatFieldName(rule.field_path) + ' is set',
    resultCode: buildResultCode(rule.rule_key, 'PASS')
  };
}

function evaluateMinCount(value, config, rule, context) {
  const minCount = config.min_count || 1;
  const actual = context.trackCount;

  if (actual < minCount) {
    return {
      passed: false,
      message: 'Release has ' + actual + ' track(s), requires at least ' + minCount,
      resultCode: buildResultCode(rule.rule_key, 'INSUFFICIENT_COUNT')
    };
  }

  return {
    passed: true,
    message: 'Release has ' + actual + ' track(s)',
    resultCode: buildResultCode(rule.rule_key, 'PASS')
  };
}

// ---- Helpers ----

function parseConfig(configStr) {
  if (!configStr) return {};
  if (typeof configStr === 'object') return configStr;
  try {
    return JSON.parse(configStr);
  } catch {
    return {};
  }
}

function mapStatus(passed, severity) {
  if (passed) return 'pass';
  switch (severity) {
    case 'error': return 'fail';
    case 'warning': return 'warning';
    case 'info': return 'info';
    default: return 'fail';
  }
}

function computeFieldPath(rule, trackIndex, track) {
  if (!rule.field_path) return null;
  if (track) {
    return 'tracks[' + trackIndex + '].' + rule.field_path;
  }
  return rule.field_path;
}

function formatFieldName(fieldPath) {
  if (!fieldPath) return 'Field';
  // Extract the last segment and convert to readable
  const parts = fieldPath.split('.');
  const last = parts[parts.length - 1];
  // Convert snake_case to Title Case
  return last.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function buildResultCode(ruleKey, suffix) {
  // release.title_required + REQUIRED → RELEASE_TITLE_REQUIRED
  // track.bpm_range + BELOW_MIN → TRACK_BPM_RANGE_BELOW_MIN
  const prefix = ruleKey.toUpperCase().split('.').join('_');
  if (suffix === 'PASS') return prefix + '_PASS';
  return prefix + '_' + suffix;
}

module.exports = { evaluateRelease };
