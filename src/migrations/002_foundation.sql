-- ============================================================
-- TrackRail — Foundation Migration
-- Canonical domain model adjustments, event log, decision layer
-- ============================================================

-- ============================================================
-- 1. DOMAIN EVENTS (activity log / audit trail)
-- Lightweight event sourcing for traceability
-- ============================================================
CREATE TABLE IF NOT EXISTS domain_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,              -- e.g. 'release.created', 'track.uploaded', 'validation.run'
    entity_type TEXT NOT NULL,             -- 'release', 'track', 'collaborator', 'split', 'copyright', etc.
    entity_id TEXT NOT NULL,               -- UUID of the entity
    actor_type TEXT NOT NULL DEFAULT 'system',  -- 'user', 'system', 'ai'
    actor_id TEXT,                         -- user ID when applicable (NULL for system)
    payload TEXT,                          -- JSON: event-specific data
    metadata TEXT,                         -- JSON: request context, ip, user-agent, etc.
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_entity ON domain_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON domain_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_actor ON domain_events(actor_id);

-- ============================================================
-- 2. IDENTIFIERS (unified identifier registry)
-- One table for all external identifiers: ISRC, UPC, ISWC, IPI, ISNI
-- ============================================================
CREATE TABLE IF NOT EXISTS identifiers (
    id TEXT PRIMARY KEY,
    identifier_type TEXT NOT NULL,         -- 'isrc', 'upc', 'iswc', 'ipi', 'isni', 'pro_member_id'
    identifier_value TEXT NOT NULL,
    entity_type TEXT NOT NULL,             -- 'track', 'release', 'collaborator', 'rights_holder'
    entity_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'generated', 'imported', 'verified'
    verified INTEGER DEFAULT 0,
    issued_at TEXT,
    issued_by TEXT,                        -- actor who assigned it
    revoked INTEGER DEFAULT 0,
    revocation_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS idx_identifiers_entity ON identifiers(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_identifiers_type_value ON identifiers(identifier_type, identifier_value);

-- ============================================================
-- 3. DECISIONS (separate from scores)
-- Scores measure. Decisions act. Keep them apart.
-- ============================================================
CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,             -- 'release', 'track', 'user'
    entity_id TEXT NOT NULL,
    decision_type TEXT NOT NULL,           -- 'release_readiness', 'distribution_approval', 'fraud_review', 'quality_gate'
    outcome TEXT NOT NULL,                 -- 'approved', 'flagged', 'blocked', 'pending_review'
    reason_code TEXT,                      -- machine-readable: 'metadata_incomplete', 'splits_invalid', etc.
    reason_text TEXT,                      -- human-readable explanation
    score_snapshot TEXT,                   -- JSON: scores at time of decision { quality: 84, fraud: 12 }
    rules_applied TEXT,                    -- JSON: array of rule IDs that contributed
    decided_by TEXT NOT NULL DEFAULT 'system',  -- 'system', 'user', 'admin'
    decided_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,                       -- decisions can expire (re-evaluate needed)
    overridden INTEGER DEFAULT 0,
    overridden_by TEXT,
    overridden_at TEXT,
    override_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_decisions_entity ON decisions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_decisions_outcome ON decisions(outcome);
