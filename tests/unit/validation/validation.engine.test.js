const { evaluateRelease } = require('../../../src/services/validation/validation.engine');

// ---- Test Fixtures ----

function makeRelease(overrides = {}) {
  return {
    id: 'rel-001',
    title: 'My Great Song',
    release_type: 'single',
    status: 'draft',
    genre: 'Pop',
    release_date: null,
    artwork_path: null,
    ...overrides
  };
}

function makeTrack(overrides = {}) {
  return {
    id: 'trk-001',
    title: 'Track One',
    track_number: 1,
    file_path: '/uploads/song.wav',
    file_name: 'song.wav',
    genre: 'Pop',
    isrc_code: 'US-TRL-26-00001',
    bpm: 120,
    duration_seconds: 210,
    explicit: 0,
    ...overrides
  };
}

function makeRule(overrides = {}) {
  return {
    id: 'rule-001',
    rule_key: 'test.rule',
    name: 'Test Rule',
    description: 'A test rule',
    category: 'test',
    scope: 'release',
    severity: 'error',
    rule_type: 'required',
    field_path: 'title',
    rule_config: null,
    suggested_fix: 'Fix it',
    enabled: 1,
    version: 1,
    ...overrides
  };
}

// ---- Required Rule Type ----

describe('Validation Engine', () => {
  describe('evaluateRelease', () => {
    test('returns empty results for empty rules array', () => {
      const result = evaluateRelease(makeRelease(), [], []);
      expect(result.results).toEqual([]);
      expect(result.summary.total).toBe(0);
      expect(result.summary.score).toBe(100);
    });

    test('evaluates release-level rules only against release', () => {
      const rules = [makeRule({ scope: 'release', field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease(), [], rules);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('pass');
    });

    test('evaluates track-level rules against each track', () => {
      const rules = [makeRule({ scope: 'track', field_path: 'title', rule_type: 'required' })];
      const tracks = [makeTrack({ id: 'trk-1' }), makeTrack({ id: 'trk-2' })];
      const result = evaluateRelease(makeRelease(), tracks, rules);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].track_id).toBe('trk-1');
      expect(result.results[1].track_id).toBe('trk-2');
    });

    test('release with no tracks produces no track-level results', () => {
      const rules = [makeRule({ scope: 'track', field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease(), [], rules);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('Required rule type', () => {
    const rule = makeRule({ rule_type: 'required', field_path: 'title', severity: 'error' });

    test('passes when value is a non-empty string', () => {
      const result = evaluateRelease(makeRelease({ title: 'Hello' }), [], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('fails when value is null', () => {
      const result = evaluateRelease(makeRelease({ title: null }), [], [rule]);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].result_code).toContain('REQUIRED');
    });

    test('fails when value is undefined', () => {
      const release = makeRelease();
      delete release.title;
      const result = evaluateRelease(release, [], [rule]);
      expect(result.results[0].status).toBe('fail');
    });

    test('fails when value is empty string', () => {
      const result = evaluateRelease(makeRelease({ title: '' }), [], [rule]);
      expect(result.results[0].status).toBe('fail');
    });

    test('fails when value is whitespace only', () => {
      const result = evaluateRelease(makeRelease({ title: '   ' }), [], [rule]);
      expect(result.results[0].status).toBe('fail');
    });

    test('passes when value is 0 (number)', () => {
      const numRule = makeRule({ rule_type: 'required', field_path: 'explicit', scope: 'track' });
      const result = evaluateRelease(makeRelease(), [makeTrack({ explicit: 0 })], [numRule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('includes suggested_fix on failure', () => {
      const result = evaluateRelease(makeRelease({ title: null }), [], [rule]);
      expect(result.results[0].suggested_fix).toBe('Fix it');
    });

    test('does not include suggested_fix on pass', () => {
      const result = evaluateRelease(makeRelease({ title: 'OK' }), [], [rule]);
      expect(result.results[0].suggested_fix).toBeNull();
    });
  });

  describe('Format rule type (not_all_caps)', () => {
    const rule = makeRule({
      rule_type: 'format',
      field_path: 'title',
      severity: 'warning',
      rule_config: '{"check": "not_all_caps", "allow_single_word": true}'
    });

    test('passes for normal title case', () => {
      const result = evaluateRelease(makeRelease({ title: 'Hello World' }), [], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('passes for lowercase', () => {
      const result = evaluateRelease(makeRelease({ title: 'hello world' }), [], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('passes for mixed case', () => {
      const result = evaluateRelease(makeRelease({ title: 'hELLo WoRLd' }), [], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('fails for multi-word all caps', () => {
      const result = evaluateRelease(makeRelease({ title: 'HELLO WORLD' }), [], [rule]);
      expect(result.results[0].status).toBe('warning');
      expect(result.results[0].result_code).toContain('ALL_CAPS');
    });

    test('passes for single word all caps when allowed', () => {
      const result = evaluateRelease(makeRelease({ title: 'OK' }), [], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('fails for single word all caps when not allowed', () => {
      const strictRule = makeRule({
        rule_type: 'format',
        field_path: 'title',
        severity: 'warning',
        rule_config: '{"check": "not_all_caps", "allow_single_word": false}'
      });
      const result = evaluateRelease(makeRelease({ title: 'OK' }), [], [strictRule]);
      expect(result.results[0].status).toBe('warning');
    });

    test('passes for numbers only (no alphabetic chars)', () => {
      const result = evaluateRelease(makeRelease({ title: '12345' }), [], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('passes for symbols only', () => {
      const result = evaluateRelease(makeRelease({ title: '!!!' }), [], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('skips when value is null', () => {
      const result = evaluateRelease(makeRelease({ title: null }), [], [rule]);
      expect(result.results[0].status).toBe('skipped');
    });

    test('skips when value is empty string', () => {
      const result = evaluateRelease(makeRelease({ title: '' }), [], [rule]);
      expect(result.results[0].status).toBe('skipped');
    });

    test('fails for "ALL CAPS TITLE" (3 words)', () => {
      const result = evaluateRelease(makeRelease({ title: 'ALL CAPS TITLE' }), [], [rule]);
      expect(result.results[0].status).toBe('warning');
    });
  });

  describe('Range rule type', () => {
    const rule = makeRule({
      rule_type: 'range',
      field_path: 'bpm',
      severity: 'warning',
      scope: 'track',
      rule_config: '{"min": 20, "max": 300, "skip_if_null": true}'
    });

    test('passes when value is within range', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ bpm: 120 })], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('passes at exact minimum', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ bpm: 20 })], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('passes at exact maximum', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ bpm: 300 })], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('fails below minimum', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ bpm: 5 })], [rule]);
      expect(result.results[0].status).toBe('warning');
      expect(result.results[0].result_code).toContain('BELOW_MIN');
    });

    test('fails above maximum', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ bpm: 500 })], [rule]);
      expect(result.results[0].status).toBe('warning');
      expect(result.results[0].result_code).toContain('ABOVE_MAX');
    });

    test('skips when null and skip_if_null is true', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ bpm: null })], [rule]);
      expect(result.results[0].status).toBe('skipped');
    });

    test('fails when null and skip_if_null is false', () => {
      const noSkipRule = makeRule({
        rule_type: 'range',
        field_path: 'bpm',
        severity: 'warning',
        scope: 'track',
        rule_config: '{"min": 20, "max": 300}'
      });
      const result = evaluateRelease(makeRelease(), [makeTrack({ bpm: null })], [noSkipRule]);
      expect(result.results[0].status).toBe('warning');
    });

    test('fails for non-numeric value', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ bpm: 'fast' })], [rule]);
      expect(result.results[0].status).toBe('warning');
      expect(result.results[0].result_code).toContain('INVALID_NUMBER');
    });

    test('range with only min', () => {
      const minOnlyRule = makeRule({
        rule_type: 'range', field_path: 'duration_seconds', scope: 'track', severity: 'warning',
        rule_config: '{"min": 30, "skip_if_null": true}'
      });
      const result = evaluateRelease(makeRelease(), [makeTrack({ duration_seconds: 10 })], [minOnlyRule]);
      expect(result.results[0].status).toBe('warning');
    });
  });

  describe('Custom rule type: future_date', () => {
    const rule = makeRule({
      rule_type: 'custom',
      field_path: 'release_date',
      severity: 'error',
      rule_config: '{"condition": "future_date", "skip_if_status": ["released"]}'
    });

    test('fails when release_date is in the past', () => {
      const result = evaluateRelease(makeRelease({ release_date: '2020-01-01' }), [], [rule]);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].result_code).toContain('NOT_FUTURE');
    });

    test('passes when release_date is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = evaluateRelease(makeRelease({ release_date: futureDate.toISOString().split('T')[0] }), [], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('fails when release_date is not set', () => {
      const result = evaluateRelease(makeRelease({ release_date: null }), [], [rule]);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].result_code).toContain('NOT_SET');
    });

    test('skips for released status', () => {
      const result = evaluateRelease(makeRelease({ status: 'released', release_date: '2020-01-01' }), [], [rule]);
      expect(result.results[0].status).toBe('skipped');
    });

    test('fails for invalid date string', () => {
      const result = evaluateRelease(makeRelease({ release_date: 'not-a-date' }), [], [rule]);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].result_code).toContain('INVALID_DATE');
    });
  });

  describe('Custom rule type: explicitly_set', () => {
    const rule = makeRule({
      rule_type: 'custom',
      field_path: 'explicit',
      scope: 'track',
      severity: 'warning',
      rule_config: '{"condition": "explicitly_set"}'
    });

    test('passes when value is 0', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ explicit: 0 })], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('passes when value is 1', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ explicit: 1 })], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('fails when value is null', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack({ explicit: null })], [rule]);
      expect(result.results[0].status).toBe('warning');
    });

    test('fails when value is undefined', () => {
      const track = makeTrack();
      delete track.explicit;
      const result = evaluateRelease(makeRelease(), [track], [rule]);
      expect(result.results[0].status).toBe('warning');
    });
  });

  describe('Custom rule type: min_count', () => {
    const rule = makeRule({
      rule_type: 'custom',
      field_path: null,
      severity: 'error',
      rule_config: '{"condition": "min_count", "min_count": 1}'
    });

    test('fails when release has 0 tracks', () => {
      const result = evaluateRelease(makeRelease(), [], [rule]);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].result_code).toContain('INSUFFICIENT_COUNT');
    });

    test('passes when release has 1 track', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack()], [rule]);
      expect(result.results[0].status).toBe('pass');
    });

    test('passes when release has multiple tracks', () => {
      const result = evaluateRelease(makeRelease(), [makeTrack(), makeTrack({ id: 'trk-2' })], [rule]);
      expect(result.results[0].status).toBe('pass');
    });
  });

  describe('Score calculation', () => {
    test('score is 100 when all rules pass', () => {
      const rules = [
        makeRule({ id: 'r1', rule_key: 'a', field_path: 'title', rule_type: 'required' }),
        makeRule({ id: 'r2', rule_key: 'b', field_path: 'genre', rule_type: 'required' })
      ];
      const result = evaluateRelease(makeRelease({ title: 'OK', genre: 'Pop' }), [], rules);
      expect(result.summary.score).toBe(100);
    });

    test('score is 0 when all rules fail', () => {
      const rules = [
        makeRule({ id: 'r1', rule_key: 'a', field_path: 'title', rule_type: 'required' }),
        makeRule({ id: 'r2', rule_key: 'b', field_path: 'genre', rule_type: 'required' })
      ];
      const result = evaluateRelease(makeRelease({ title: null, genre: null }), [], rules);
      expect(result.summary.score).toBe(0);
    });

    test('score is 50 when half pass', () => {
      const rules = [
        makeRule({ id: 'r1', rule_key: 'a', field_path: 'title', rule_type: 'required' }),
        makeRule({ id: 'r2', rule_key: 'b', field_path: 'genre', rule_type: 'required' })
      ];
      const result = evaluateRelease(makeRelease({ title: 'OK', genre: null }), [], rules);
      expect(result.summary.score).toBe(50);
    });

    test('skipped rules are excluded from score denominator', () => {
      const rules = [
        makeRule({ id: 'r1', rule_key: 'a', field_path: 'title', rule_type: 'required' }),
        makeRule({ id: 'r2', rule_key: 'b', field_path: 'bpm', scope: 'track', rule_type: 'range', rule_config: '{"min": 20, "max": 300, "skip_if_null": true}' })
      ];
      // Track with null bpm = skipped, release title present = pass
      const result = evaluateRelease(makeRelease({ title: 'OK' }), [makeTrack({ bpm: null })], rules);
      expect(result.summary.skipped).toBe(1);
      expect(result.summary.passed).toBe(1);
      // Score should be 100 (1 pass out of 1 applicable)
      expect(result.summary.score).toBe(100);
    });

    test('score is 100 when no rules provided', () => {
      const result = evaluateRelease(makeRelease(), [], []);
      expect(result.summary.score).toBe(100);
    });
  });

  describe('Summary counts', () => {
    test('counts all status types correctly', () => {
      const rules = [
        makeRule({ id: 'r1', rule_key: 'a', field_path: 'title', rule_type: 'required', severity: 'error' }),
        makeRule({ id: 'r2', rule_key: 'b', field_path: 'genre', rule_type: 'required', severity: 'error' }),
        makeRule({ id: 'r3', rule_key: 'c', field_path: 'artwork_path', rule_type: 'required', severity: 'warning' }),
        makeRule({ id: 'r4', rule_key: 'd', rule_type: 'custom', field_path: null, severity: 'error',
          rule_config: '{"condition": "min_count", "min_count": 1}' })
      ];
      const result = evaluateRelease(makeRelease({ title: 'OK', genre: null, artwork_path: null }), [makeTrack()], rules);
      expect(result.summary.passed).toBeGreaterThanOrEqual(1); // title passes, min_count passes
      expect(result.summary.failed).toBeGreaterThanOrEqual(1); // genre fails
      expect(result.summary.warnings).toBeGreaterThanOrEqual(1); // artwork
    });
  });

  describe('Field path generation', () => {
    test('release-level field path is just the field name', () => {
      const rules = [makeRule({ scope: 'release', field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease(), [], rules);
      expect(result.results[0].field_path).toBe('title');
    });

    test('track-level field path includes track index', () => {
      const rules = [makeRule({ scope: 'track', field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease(), [makeTrack(), makeTrack({ id: 'trk-2' })], rules);
      expect(result.results[0].field_path).toBe('tracks[0].title');
      expect(result.results[1].field_path).toBe('tracks[1].title');
    });

    test('field path is null when field_path is null on rule', () => {
      const rules = [makeRule({ scope: 'release', field_path: null, rule_type: 'custom', rule_config: '{"condition": "min_count", "min_count": 1}' })];
      const result = evaluateRelease(makeRelease(), [], rules);
      expect(result.results[0].field_path).toBeNull();
    });
  });

  describe('Severity mapping', () => {
    test('error severity produces fail status', () => {
      const rules = [makeRule({ severity: 'error', field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease({ title: null }), [], rules);
      expect(result.results[0].status).toBe('fail');
    });

    test('warning severity produces warning status', () => {
      const rules = [makeRule({ severity: 'warning', field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease({ title: null }), [], rules);
      expect(result.results[0].status).toBe('warning');
    });

    test('info severity produces info status', () => {
      const rules = [makeRule({ severity: 'info', field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease({ title: null }), [], rules);
      expect(result.results[0].status).toBe('info');
    });
  });

  describe('Result object shape', () => {
    test('contains all required fields', () => {
      const rules = [makeRule({ field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease({ title: 'OK' }), [], rules);
      const r = result.results[0];

      expect(r).toHaveProperty('rule_id');
      expect(r).toHaveProperty('release_id');
      expect(r).toHaveProperty('track_id');
      expect(r).toHaveProperty('rule_key');
      expect(r).toHaveProperty('status');
      expect(r).toHaveProperty('severity');
      expect(r).toHaveProperty('field_path');
      expect(r).toHaveProperty('actual_value');
      expect(r).toHaveProperty('message');
      expect(r).toHaveProperty('suggested_fix');
      expect(r).toHaveProperty('result_code');
    });

    test('track_id is null for release-level rules', () => {
      const rules = [makeRule({ scope: 'release', field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease(), [], rules);
      expect(result.results[0].track_id).toBeNull();
    });

    test('track_id is set for track-level rules', () => {
      const rules = [makeRule({ scope: 'track', field_path: 'title', rule_type: 'required' })];
      const result = evaluateRelease(makeRelease(), [makeTrack({ id: 'trk-123' })], rules);
      expect(result.results[0].track_id).toBe('trk-123');
    });
  });

  describe('Unknown rule type', () => {
    test('unknown rule type is skipped', () => {
      const rules = [makeRule({ rule_type: 'nonsense', field_path: 'title' })];
      const result = evaluateRelease(makeRelease(), [], rules);
      expect(result.results[0].status).toBe('skipped');
    });
  });

  describe('Full release scenario', () => {
    test('complete release with tracks produces expected results', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const release = makeRelease({
        title: 'My Album',
        genre: 'Rock',
        release_date: futureDate.toISOString().split('T')[0],
        artwork_path: '/uploads/cover.jpg'
      });

      const tracks = [
        makeTrack({ id: 't1', title: 'Song One', file_path: '/uploads/s1.wav', genre: 'Rock', isrc_code: 'US-TRL-26-00001', bpm: 120, duration_seconds: 200, explicit: 0 }),
        makeTrack({ id: 't2', title: 'Song Two', file_path: '/uploads/s2.wav', genre: 'Rock', isrc_code: 'US-TRL-26-00002', bpm: 95, duration_seconds: 180, explicit: 1 })
      ];

      // Use all 14 seed rule equivalents
      const rules = [
        makeRule({ id: 'r1', rule_key: 'release.title_required', scope: 'release', field_path: 'title', rule_type: 'required', severity: 'error' }),
        makeRule({ id: 'r2', rule_key: 'release.title_not_all_caps', scope: 'release', field_path: 'title', rule_type: 'format', severity: 'warning', rule_config: '{"check":"not_all_caps","allow_single_word":true}' }),
        makeRule({ id: 'r3', rule_key: 'release.release_date_future', scope: 'release', field_path: 'release_date', rule_type: 'custom', severity: 'error', rule_config: '{"condition":"future_date","skip_if_status":["released"]}' }),
        makeRule({ id: 'r4', rule_key: 'release.genre_required', scope: 'release', field_path: 'genre', rule_type: 'required', severity: 'error' }),
        makeRule({ id: 'r5', rule_key: 'release.artwork_exists', scope: 'release', field_path: 'artwork_path', rule_type: 'required', severity: 'warning' }),
        makeRule({ id: 'r6', rule_key: 'release.has_tracks', scope: 'release', field_path: null, rule_type: 'custom', severity: 'error', rule_config: '{"condition":"min_count","min_count":1}' }),
        makeRule({ id: 'r7', rule_key: 'track.title_required', scope: 'track', field_path: 'title', rule_type: 'required', severity: 'error' }),
        makeRule({ id: 'r8', rule_key: 'track.isrc_assigned', scope: 'track', field_path: 'isrc_code', rule_type: 'required', severity: 'warning' }),
        makeRule({ id: 'r9', rule_key: 'track.file_exists', scope: 'track', field_path: 'file_path', rule_type: 'required', severity: 'error' }),
        makeRule({ id: 'r10', rule_key: 'track.bpm_range', scope: 'track', field_path: 'bpm', rule_type: 'range', severity: 'warning', rule_config: '{"min":20,"max":300,"skip_if_null":true}' }),
      ];

      const result = evaluateRelease(release, tracks, rules);

      // All should pass for this well-formed release
      expect(result.summary.failed).toBe(0);
      expect(result.summary.warnings).toBe(0);
      expect(result.summary.score).toBe(100);
      expect(result.summary.total).toBe(6 + (4 * 2)); // 6 release + 4 track rules * 2 tracks
    });
  });
});
