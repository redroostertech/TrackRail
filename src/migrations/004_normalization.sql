-- ============================================================
-- TrackRail — Phase 1B: Metadata Normalization Pipeline
-- ============================================================

-- Genre taxonomy (hierarchical)
CREATE TABLE IF NOT EXISTS genre_taxonomy (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES genre_taxonomy(id),
    level INTEGER NOT NULL DEFAULT 0,
    aliases TEXT,
    platform_mappings TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_genre_parent ON genre_taxonomy(parent_id);
CREATE INDEX IF NOT EXISTS idx_genre_level ON genre_taxonomy(level);
CREATE INDEX IF NOT EXISTS idx_genre_name ON genre_taxonomy(name);

-- Normalization runs
CREATE TABLE IF NOT EXISTS normalization_runs (
    id TEXT PRIMARY KEY,
    release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'completed',
    total_suggestions INTEGER DEFAULT 0,
    accepted INTEGER DEFAULT 0,
    rejected INTEGER DEFAULT 0,
    pending INTEGER DEFAULT 0,
    run_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nrun_release ON normalization_runs(release_id);
CREATE INDEX IF NOT EXISTS idx_nrun_run_at ON normalization_runs(run_at);

-- Normalization suggestions
CREATE TABLE IF NOT EXISTS normalization_suggestions (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES normalization_runs(id) ON DELETE CASCADE,
    release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
    field_path TEXT NOT NULL,
    original_value TEXT,
    normalized_value TEXT NOT NULL,
    rule_applied TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    reasoning TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    accepted_at TEXT,
    rejected_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nsugg_run ON normalization_suggestions(run_id);
CREATE INDEX IF NOT EXISTS idx_nsugg_release ON normalization_suggestions(release_id);
CREATE INDEX IF NOT EXISTS idx_nsugg_status ON normalization_suggestions(status);

-- ============================================================
-- Seed: Genre Taxonomy (~65 genres)
-- ============================================================

-- Top-level genres (15)
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-pop', 'Pop', NULL, 0, '["Pop Music"]', 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-hiphop', 'Hip-Hop', NULL, 0, '["Rap", "Hip Hop", "Hiphop", "HipHop"]', 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-electronic', 'Electronic', NULL, 0, '["EDM", "Dance", "Dance Music", "Electronic Dance Music"]', 3);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-rock', 'Rock', NULL, 0, '["Rock Music"]', 4);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-rnb', 'R&B', NULL, 0, '["RnB", "Rhythm and Blues", "R and B", "RB"]', 5);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-country', 'Country', NULL, 0, '["Country Western", "Country Music"]', 6);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-jazz', 'Jazz', NULL, 0, NULL, 7);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-latin', 'Latin', NULL, 0, '["Latin Music", "Latino"]', 8);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-classical', 'Classical', NULL, 0, '["Classical Music"]', 9);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-metal', 'Metal', NULL, 0, '["Heavy Metal"]', 10);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-folk', 'Folk', NULL, 0, '["Folk Music"]', 11);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-reggae', 'Reggae', NULL, 0, NULL, 12);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-blues', 'Blues', NULL, 0, NULL, 13);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-soul', 'Soul', NULL, 0, NULL, 14);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-funk', 'Funk', NULL, 0, NULL, 15);

-- Pop subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-pop-synth', 'Synth Pop', 'genre-pop', 1, '["Synthpop", "Synth-Pop"]', 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-pop-indie', 'Indie Pop', 'genre-pop', 1, NULL, 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-pop-dance', 'Dance Pop', 'genre-pop', 1, NULL, 3);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-pop-art', 'Art Pop', 'genre-pop', 1, NULL, 4);

-- Hip-Hop subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-hiphop-trap', 'Trap', 'genre-hiphop', 1, '["Trap Music"]', 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-hiphop-conscious', 'Conscious Hip-Hop', 'genre-hiphop', 1, '["Conscious Rap"]', 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-hiphop-boombap', 'Boom Bap', 'genre-hiphop', 1, '["BoomBap"]', 3);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-hiphop-lofi', 'Lo-Fi Hip-Hop', 'genre-hiphop', 1, '["Lofi Hip Hop", "Lo-fi", "Lofi"]', 4);

-- Electronic subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-electronic-house', 'House', 'genre-electronic', 1, '["House Music"]', 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-electronic-techno', 'Techno', 'genre-electronic', 1, NULL, 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-electronic-dubstep', 'Dubstep', 'genre-electronic', 1, NULL, 3);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-electronic-dnb', 'Drum and Bass', 'genre-electronic', 1, '["DnB", "D&B", "Drum & Bass"]', 4);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-electronic-ambient', 'Ambient', 'genre-electronic', 1, NULL, 5);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-electronic-trance', 'Trance', 'genre-electronic', 1, NULL, 6);

-- Rock subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-rock-indie', 'Indie Rock', 'genre-rock', 1, NULL, 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-rock-alt', 'Alternative Rock', 'genre-rock', 1, '["Alternative", "Alt Rock", "Alt-Rock"]', 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-rock-punk', 'Punk Rock', 'genre-rock', 1, '["Punk"]', 3);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-rock-classic', 'Classic Rock', 'genre-rock', 1, NULL, 4);

-- R&B subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-rnb-contemporary', 'Contemporary R&B', 'genre-rnb', 1, '["Modern R&B"]', 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-rnb-neosoul', 'Neo-Soul', 'genre-rnb', 1, '["Neo Soul", "NeoSoul"]', 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-rnb-quietstorm', 'Quiet Storm', 'genre-rnb', 1, NULL, 3);

-- Country subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-country-pop', 'Country Pop', 'genre-country', 1, NULL, 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-country-americana', 'Americana', 'genre-country', 1, NULL, 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-country-bluegrass', 'Bluegrass', 'genre-country', 1, NULL, 3);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-country-outlaw', 'Outlaw Country', 'genre-country', 1, NULL, 4);

-- Jazz subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-jazz-smooth', 'Smooth Jazz', 'genre-jazz', 1, NULL, 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-jazz-bebop', 'Bebop', 'genre-jazz', 1, NULL, 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-jazz-fusion', 'Jazz Fusion', 'genre-jazz', 1, '["Fusion"]', 3);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-jazz-vocal', 'Vocal Jazz', 'genre-jazz', 1, NULL, 4);

-- Latin subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-latin-reggaeton', 'Reggaeton', 'genre-latin', 1, '["Reggaetton"]', 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-latin-salsa', 'Salsa', 'genre-latin', 1, NULL, 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-latin-bachata', 'Bachata', 'genre-latin', 1, NULL, 3);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-latin-pop', 'Latin Pop', 'genre-latin', 1, NULL, 4);

-- Classical subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-classical-orchestral', 'Orchestral', 'genre-classical', 1, NULL, 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-classical-chamber', 'Chamber Music', 'genre-classical', 1, NULL, 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-classical-opera', 'Opera', 'genre-classical', 1, NULL, 3);

-- Metal subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-metal-death', 'Death Metal', 'genre-metal', 1, NULL, 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-metal-prog', 'Progressive Metal', 'genre-metal', 1, '["Prog Metal"]', 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-metal-thrash', 'Thrash Metal', 'genre-metal', 1, '["Thrash"]', 3);

-- Folk subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-folk-indie', 'Indie Folk', 'genre-folk', 1, NULL, 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-folk-traditional', 'Traditional Folk', 'genre-folk', 1, NULL, 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-folk-singer', 'Singer-Songwriter', 'genre-folk', 1, '["Singer Songwriter"]', 3);

-- Reggae subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-reggae-dancehall', 'Dancehall', 'genre-reggae', 1, NULL, 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-reggae-dub', 'Dub', 'genre-reggae', 1, NULL, 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-reggae-roots', 'Roots Reggae', 'genre-reggae', 1, '["Roots"]', 3);

-- Blues subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-blues-delta', 'Delta Blues', 'genre-blues', 1, NULL, 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-blues-chicago', 'Chicago Blues', 'genre-blues', 1, NULL, 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-blues-electric', 'Electric Blues', 'genre-blues', 1, NULL, 3);

-- Soul subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-soul-classic', 'Classic Soul', 'genre-soul', 1, NULL, 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-soul-northern', 'Northern Soul', 'genre-soul', 1, NULL, 2);

-- Funk subgenres
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-funk-pfunk', 'P-Funk', 'genre-funk', 1, '["Parliament-Funkadelic"]', 1);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-funk-electro', 'Electro-Funk', 'genre-funk', 1, '["Electro Funk"]', 2);
INSERT OR IGNORE INTO genre_taxonomy (id, name, parent_id, level, aliases, sort_order) VALUES
('genre-funk-rock', 'Funk Rock', 'genre-funk', 1, NULL, 3);
