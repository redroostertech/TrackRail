-- ============================================================
-- TrackRail — Initial Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
);

-- Artist profile (single-artist MVP)
CREATE TABLE IF NOT EXISTS artist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    pro_affiliation TEXT DEFAULT 'none',
    pro_member_id TEXT,
    ipi_number TEXT,
    publisher_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Releases (albums, singles, EPs)
CREATE TABLE IF NOT EXISTS releases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    release_type TEXT NOT NULL DEFAULT 'single',
    status TEXT NOT NULL DEFAULT 'draft',
    artwork_path TEXT,
    genre TEXT,
    subgenre TEXT,
    label TEXT,
    upc_code TEXT,
    release_date TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Tracks
CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    track_number INTEGER NOT NULL DEFAULT 1,
    duration_seconds INTEGER,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_format TEXT,
    bpm REAL,
    musical_key TEXT,
    genre TEXT,
    mood TEXT,
    energy REAL,
    isrc_code TEXT,
    lyrics TEXT,
    explicit INTEGER DEFAULT 0,
    ai_analyzed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Collaborators
CREATE TABLE IF NOT EXISTS collaborators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'songwriter',
    pro_affiliation TEXT DEFAULT 'none',
    pro_member_id TEXT,
    ipi_number TEXT,
    publisher TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Split sheets
CREATE TABLE IF NOT EXISTS splits (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    collaborator_id TEXT NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    percentage REAL NOT NULL,
    agreed INTEGER DEFAULT 0,
    agreed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(track_id, collaborator_id, role)
);

-- Copyright registrations
CREATE TABLE IF NOT EXISTS copyrights (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    copyright_type TEXT NOT NULL DEFAULT 'sr',
    registration_number TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    claimant_name TEXT,
    author_name TEXT,
    year_completed TEXT,
    year_published TEXT,
    nation_first_publication TEXT DEFAULT 'United States',
    submitted_date TEXT,
    registered_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- PRO registrations
CREATE TABLE IF NOT EXISTS pro_registrations (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    pro_name TEXT NOT NULL,
    work_id TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    submitted_date TEXT,
    registered_date TEXT,
    iswc_code TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Distribution submissions
CREATE TABLE IF NOT EXISTS distributions (
    id TEXT PRIMARY KEY,
    release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    distributor TEXT,
    status TEXT NOT NULL DEFAULT 'not_submitted',
    submitted_date TEXT,
    live_date TEXT,
    external_url TEXT,
    external_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Release milestones
CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    milestone_type TEXT NOT NULL DEFAULT 'custom',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Streaming analytics
CREATE TABLE IF NOT EXISTS stream_stats (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    date TEXT NOT NULL,
    streams INTEGER DEFAULT 0,
    revenue REAL DEFAULT 0.0,
    saves INTEGER DEFAULT 0,
    playlist_adds INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(track_id, platform, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracks_release ON tracks(release_id);
CREATE INDEX IF NOT EXISTS idx_splits_track ON splits(track_id);
CREATE INDEX IF NOT EXISTS idx_splits_collaborator ON splits(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_copyrights_track ON copyrights(track_id);
CREATE INDEX IF NOT EXISTS idx_pro_track ON pro_registrations(track_id);
CREATE INDEX IF NOT EXISTS idx_distributions_release ON distributions(release_id);
CREATE INDEX IF NOT EXISTS idx_milestones_release ON milestones(release_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due ON milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_stats_track ON stream_stats(track_id);
CREATE INDEX IF NOT EXISTS idx_stats_date ON stream_stats(date);

-- Seed default artist
INSERT OR IGNORE INTO artist (id, name, pro_affiliation) VALUES (1, 'My Artist Name', 'none');
