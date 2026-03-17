-- ============================================================
-- TrackRail — Phase 1A: Metadata Validation Rules Engine
-- ============================================================

-- Rule definitions (configurable, data-driven)
CREATE TABLE IF NOT EXISTS validation_rules (
    id TEXT PRIMARY KEY,
    rule_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'release',
    severity TEXT NOT NULL DEFAULT 'error',
    rule_type TEXT NOT NULL,
    field_path TEXT,
    rule_config TEXT,
    suggested_fix TEXT,
    enabled INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vr_category ON validation_rules(category);
CREATE INDEX IF NOT EXISTS idx_vr_scope ON validation_rules(scope);
CREATE INDEX IF NOT EXISTS idx_vr_enabled ON validation_rules(enabled);

-- Validation runs (one per execution against a release)
CREATE TABLE IF NOT EXISTS validation_runs (
    id TEXT PRIMARY KEY,
    release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'completed',
    total_rules INTEGER NOT NULL DEFAULT 0,
    passed INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    warnings INTEGER NOT NULL DEFAULT 0,
    infos INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    run_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vrun_release ON validation_runs(release_id);
CREATE INDEX IF NOT EXISTS idx_vrun_run_at ON validation_runs(run_at);

-- Individual rule results per run
CREATE TABLE IF NOT EXISTS validation_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES validation_runs(id) ON DELETE CASCADE,
    release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL REFERENCES validation_rules(id),
    rule_key TEXT NOT NULL,
    status TEXT NOT NULL,
    severity TEXT NOT NULL,
    field_path TEXT,
    actual_value TEXT,
    message TEXT NOT NULL,
    suggested_fix TEXT,
    result_code TEXT NOT NULL,
    acknowledged INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vres_run ON validation_results(run_id);
CREATE INDEX IF NOT EXISTS idx_vres_release ON validation_results(release_id);
CREATE INDEX IF NOT EXISTS idx_vres_rule ON validation_results(rule_id);
CREATE INDEX IF NOT EXISTS idx_vres_status ON validation_results(status);

-- ============================================================
-- Seed: 14 default validation rules
-- ============================================================

-- Release-level rules (6)
INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-001', 'release.title_required', 'Release Title Required', 'Release must have a title', 'title', 'release', 'error', 'required', 'title', NULL, 'Add a title to your release');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-002', 'release.title_not_all_caps', 'Release Title Not All Caps', 'Release title should not be in all capital letters unless it is a single word', 'title', 'release', 'warning', 'format', 'title', '{"check": "not_all_caps", "allow_single_word": true}', 'Use title case instead of all caps (e.g. "My Song" not "MY SONG")');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-003', 'release.release_date_future', 'Release Date Must Be Future', 'Release date must be in the future for unreleased releases', 'release', 'release', 'error', 'custom', 'release_date', '{"condition": "future_date", "skip_if_status": ["released"]}', 'Set a release date in the future');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-004', 'release.genre_required', 'Genre Required', 'Release must have a genre specified', 'release', 'release', 'error', 'required', 'genre', NULL, 'Select a genre for your release');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-005', 'release.artwork_exists', 'Artwork Recommended', 'Release should have cover artwork uploaded', 'artwork', 'release', 'warning', 'required', 'artwork_path', NULL, 'Upload cover artwork for your release');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-006', 'release.has_tracks', 'Release Must Have Tracks', 'Release must contain at least one track', 'release', 'release', 'error', 'custom', NULL, '{"condition": "min_count", "min_count": 1}', 'Upload at least one track to your release');

-- Track-level rules (8)
INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-007', 'track.title_required', 'Track Title Required', 'Every track must have a title', 'title', 'track', 'error', 'required', 'title', NULL, 'Add a title to this track');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-008', 'track.title_not_all_caps', 'Track Title Not All Caps', 'Track title should not be in all capital letters unless it is a single word', 'title', 'track', 'warning', 'format', 'title', '{"check": "not_all_caps", "allow_single_word": true}', 'Use title case instead of all caps');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-009', 'track.isrc_assigned', 'ISRC Code Recommended', 'Track should have an ISRC code assigned', 'track', 'track', 'warning', 'required', 'isrc_code', NULL, 'Generate or assign an ISRC code for this track');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-010', 'track.genre_set', 'Track Genre Recommended', 'Track should have a genre specified', 'track', 'track', 'warning', 'required', 'genre', NULL, 'Run AI analysis or manually set the genre');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-011', 'track.file_exists', 'Audio File Required', 'Track must have an audio file uploaded', 'audio', 'track', 'error', 'required', 'file_path', NULL, 'Upload an audio file for this track');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-012', 'track.explicit_set', 'Explicit Flag Recommended', 'Track should have the explicit content flag explicitly set', 'track', 'track', 'warning', 'custom', 'explicit', '{"condition": "explicitly_set"}', 'Set the explicit content flag for this track');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-013', 'track.bpm_range', 'BPM In Valid Range', 'BPM should be between 20 and 300 if specified', 'audio', 'track', 'warning', 'range', 'bpm', '{"min": 20, "max": 300, "skip_if_null": true}', 'Verify the BPM is correct (expected range: 20-300)');

INSERT OR IGNORE INTO validation_rules (id, rule_key, name, description, category, scope, severity, rule_type, field_path, rule_config, suggested_fix) VALUES
('vr-014', 'track.duration_minimum', 'Track Duration Minimum', 'Track should be at least 30 seconds long', 'audio', 'track', 'warning', 'range', 'duration_seconds', '{"min": 30, "skip_if_null": true}', 'Track is very short. Most distributors require tracks to be at least 30 seconds');
