const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  // ---- Rules ----

  findAllRules(filters = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM validation_rules';
    const conditions = [];
    const params = [];

    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }
    if (filters.severity) {
      conditions.push('severity = ?');
      params.push(filters.severity);
    }
    if (filters.scope) {
      conditions.push('scope = ?');
      params.push(filters.scope);
    }
    if (filters.enabled !== undefined && filters.enabled !== '') {
      conditions.push('enabled = ?');
      params.push(Number(filters.enabled));
    }
    if (filters.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push('%' + filters.search + '%', '%' + filters.search + '%');
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY category ASC, name ASC';

    return db.prepare(sql).all(...params);
  },

  findRuleById(id) {
    return getDb().prepare('SELECT * FROM validation_rules WHERE id = ?').get(id);
  },

  findRuleByKey(ruleKey) {
    return getDb().prepare('SELECT * FROM validation_rules WHERE rule_key = ?').get(ruleKey);
  },

  findEnabledRules(scope) {
    const db = getDb();
    if (scope) {
      return db.prepare('SELECT * FROM validation_rules WHERE enabled = 1 AND scope = ? ORDER BY category ASC, name ASC').all(scope);
    }
    return db.prepare('SELECT * FROM validation_rules WHERE enabled = 1 ORDER BY category ASC, name ASC').all();
  },

  updateRule(id, data) {
    const db = getDb();
    const existing = this.findRuleById(id);
    if (!existing) return null;

    const fields = [];
    const params = [];
    const allowed = ['name', 'description', 'severity', 'enabled', 'rule_config', 'suggested_fix'];
    let versionBump = false;

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(key + ' = ?');
        params.push(data[key]);
        if (key === 'rule_config' || key === 'severity') versionBump = true;
      }
    }

    if (!fields.length) return existing;

    if (versionBump) {
      fields.push('version = version + 1');
    }
    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare('UPDATE validation_rules SET ' + fields.join(', ') + ' WHERE id = ?').run(...params);
    return this.findRuleById(id);
  },

  // ---- Runs ----

  createRun(data) {
    const db = getDb();
    const id = uuid();
    db.prepare(`INSERT INTO validation_runs (id, release_id, status, total_rules, passed, failed, warnings, infos, score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.release_id, data.status || 'completed',
      data.total_rules, data.passed, data.failed, data.warnings, data.infos, data.score
    );
    return this.findRunById(id);
  },

  findRunById(id) {
    return getDb().prepare('SELECT * FROM validation_runs WHERE id = ?').get(id);
  },

  findLatestRun(releaseId) {
    return getDb().prepare(
      'SELECT * FROM validation_runs WHERE release_id = ? ORDER BY run_at DESC LIMIT 1'
    ).get(releaseId);
  },

  findRunsByRelease(releaseId, limit = 20) {
    return getDb().prepare(
      'SELECT * FROM validation_runs WHERE release_id = ? ORDER BY run_at DESC LIMIT ?'
    ).all(releaseId, limit);
  },

  // ---- Results ----

  createResults(results) {
    const db = getDb();
    const insert = db.prepare(`INSERT INTO validation_results
      (id, run_id, release_id, track_id, rule_id, rule_key, status, severity, field_path, actual_value, message, suggested_fix, result_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    const insertMany = db.transaction((items) => {
      for (const r of items) {
        insert.run(
          uuid(), r.run_id, r.release_id, r.track_id || null,
          r.rule_id, r.rule_key, r.status, r.severity,
          r.field_path || null, r.actual_value != null ? String(r.actual_value) : null,
          r.message, r.suggested_fix || null, r.result_code
        );
      }
    });

    insertMany(results);
  },

  findResultsByRun(runId) {
    return getDb().prepare(`
      SELECT vr.*, vrule.name as rule_name
      FROM validation_results vr
      JOIN validation_rules vrule ON vr.rule_id = vrule.id
      WHERE vr.run_id = ?
      ORDER BY
        CASE vr.status WHEN 'fail' THEN 0 WHEN 'warning' THEN 1 WHEN 'info' THEN 2 WHEN 'pass' THEN 3 WHEN 'skipped' THEN 4 END,
        vr.field_path ASC
    `).all(runId);
  },

  findResultById(id) {
    return getDb().prepare('SELECT * FROM validation_results WHERE id = ?').get(id);
  },

  acknowledgeResult(id) {
    getDb().prepare('UPDATE validation_results SET acknowledged = 1 WHERE id = ?').run(id);
    return this.findResultById(id);
  }
};
