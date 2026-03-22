# TrackRail — Product Roadmap

> **AI-Powered Music Release Infrastructure Platform**
> "Stripe for Music Releases"
>
> Last Updated: 2026-03-22

---

## Vision

TrackRail is an infrastructure layer that automates the entire music release pipeline — from metadata preparation to copyright filing, distribution delivery, and royalty tracking. Independent artists currently juggle 10+ separate tools (copyright office, distributor, PRO, SoundExchange, Content ID, split sheets, etc.). TrackRail unifies all of that into a single platform.

The product follows the **TurboTax model**: AI prepares everything, the user reviews and confirms, then automation handles the tedious steps. No invisible automation — human confirmation at every legal attestation point.

---

## Architecture

```
Routes → Controllers → Services → Repositories
                          ↓
                    Pure Engines (no I/O)
                          ↓
                Foundation Services:
                  - Domain Events (audit trail)
                  - Decisions (scores → outcomes)
                  - Identifiers (ISRC/UPC/ISWC registry)
```

**Tech Stack:** Node.js/Express 5, SQLite (better-sqlite3), OpenAI (optional), vanilla JS frontend, custom dark UI

**Key Constraints:**
- No regex anywhere (string methods only)
- All GETs support filtering/sorting/pagination
- Documents = structured data first, PDFs second
- Scores separate from decisions (scores measure, decisions act)
- Non-destructive operations (suggest → review → apply)

---

## Phase 1: Foundation (Metadata + Validation + Quality)

**Goal:** Transform the MVP from a tracking tool into an intelligent validation and normalization platform.

### 1A. Metadata Validation Rules Engine — COMPLETE

Configurable, data-driven validation engine that checks release and track metadata against industry standards.

**What it does:**
- 14 seed validation rules stored in the database (not hardcoded)
- Rule types: `required`, `format`, `range`, `custom`
- Categories: title, contributor, territory, audio, artwork, release, track
- Severity levels: `error` (blocks release), `warning` (flags for review), `info`
- Field path targeting (e.g., `title`, `tracks[0].bpm`)
- Machine-readable result codes (e.g., `RELEASE_TITLE_REQUIRED`)
- Human-readable explanation + suggested fix text
- Rule versioning (auto-increments on config/severity change)

**Seed Rules (14):**

| Scope | Rule | Type | Severity |
|-------|------|------|----------|
| Release | Title required | required | error |
| Release | Title not all caps | format | warning |
| Release | Release date must be future | custom | error |
| Release | Genre required | required | error |
| Release | Artwork recommended | required | warning |
| Release | Must have tracks | custom | error |
| Track | Title required | required | error |
| Track | Title not all caps | format | warning |
| Track | ISRC recommended | required | warning |
| Track | Genre recommended | required | warning |
| Track | Audio file required | required | error |
| Track | Explicit flag set | custom | warning |
| Track | BPM in range (20-300) | range | warning |
| Track | Duration minimum (30s) | range | warning |

**Integration:**
- Records `VALIDATION_RUN` domain event after each run
- Calls decisions engine to produce release readiness outcome (approved/flagged/blocked)
- Validation score (0-100) computed as `passed / applicable * 100`

**API Endpoints:**
- `GET /api/v1/validation/rules` — list rules (filter by category, severity, scope)
- `GET /api/v1/validation/rules/:id` — single rule
- `PUT /api/v1/validation/rules/:id` — update rule (enable/disable, change severity)
- `POST /api/v1/releases/:id/validate` — run validation engine
- `GET /api/v1/releases/:id/validation` — get latest results
- `GET /api/v1/releases/:id/validation/history` — run history
- `PUT /api/v1/validation/results/:id/acknowledge` — dismiss a warning

**Frontend:** Validation tab on release detail page with score display, decision badge, results grouped by severity, acknowledge/dismiss buttons.

**Tests:** 90 passing (engine unit, controller unit, API integration)

**Files:**
```
src/services/validation/
├── validation.routes.js
├── validation.controller.js
├── validation.service.js
├── validation.repository.js
└── validation.engine.js
src/migrations/003_validation.sql
```

---

### 1B. Metadata Normalization Pipeline — COMPLETE

Non-destructive normalization engine that standardizes freeform metadata into industry-standard format via a suggestion/review/accept workflow.

**What it does:**
- 7 normalization rule types (all deterministic, no regex)
- Non-destructive: suggestions stored as pending, user reviews, accepted suggestions apply changes
- Bigram fuzzy string similarity for genre and mood matching (no external dependencies)

**Normalization Rules:**

| Rule | Input → Output | Confidence |
|------|---------------|------------|
| Title case | "my great song" → "My Great Song" | 1.0 |
| Whitespace cleanup | "  hello   world  " → "hello world" | 1.0 |
| Genre standardization | "EDM" → "Electronic" (via alias/fuzzy) | 0.7-1.0 |
| Subgenre validation | Check parent-child relationship | 1.0 |
| Musical key formatting | "c minor" → "C Minor" | 1.0 |
| Mood standardization | "happy" → "Uplifting" (26 synonyms + fuzzy) | 0.7-1.0 |
| BPM rounding | 120.7 → 121 | 1.0 |

**Genre Taxonomy:** 68 entries seeded (15 top-level + 53 subgenres) with aliases:
- Pop (Synth Pop, Indie Pop, Dance Pop, Art Pop)
- Hip-Hop/Rap (Trap, Conscious Hip-Hop, Boom Bap, Lo-Fi Hip-Hop)
- Electronic/EDM (House, Techno, Dubstep, Drum and Bass, Ambient, Trance)
- Rock (Indie Rock, Alternative Rock, Punk Rock, Classic Rock)
- R&B (Contemporary R&B, Neo-Soul, Quiet Storm)
- Country, Jazz, Latin, Classical, Metal, Folk, Reggae, Blues, Soul, Funk + subgenres

**Accept Flow:** When a suggestion is accepted: parse field_path → update release or track record → update suggestion status → recalculate run counts → record domain event.

**API Endpoints:**
- `GET /api/v1/normalization/genres` — browse taxonomy (search, level, parent_id)
- `GET /api/v1/normalization/genres/:id` — genre with children
- `GET /api/v1/normalization/moods` — canonical moods list
- `GET /api/v1/normalization/keys` — canonical musical keys list
- `POST /api/v1/releases/:id/normalize` — run normalization engine
- `GET /api/v1/releases/:id/normalization` — get latest suggestions
- `POST /api/v1/releases/:id/normalization/accept-all` — accept all pending
- `PUT /api/v1/normalization/suggestions/:id/accept` — accept single
- `PUT /api/v1/normalization/suggestions/:id/reject` — reject single

**Frontend:** Normalize tab on release detail page with diff view (original → normalized), confidence badges, accept/reject buttons, Accept All bulk action.

**Tests:** 98 passing (engine 68, controller 14, API integration 16)

**Files:**
```
src/services/normalization/
├── normalization.routes.js
├── normalization.controller.js
├── normalization.service.js
├── normalization.repository.js
└── normalization.engine.js
src/migrations/004_normalization.sql
```

---

### 1C. Release Quality Score — NOT STARTED

Composite 0-100 score from multiple dimensions: metadata completeness, validation pass rate, audio quality, artwork specs, split sheet completion, copyright status, ISRC assignment. Evolves the existing checklist into a quantified scoring system.

**Planned:**
- Weighted scoring across 8+ dimensions
- Score history tracking over time
- Quality score gauge on release cards and detail page
- "What to improve" action list with priorities
- Tables: `quality_score_history`
- Extends: `releases` table with `quality_score`, `quality_breakdown` columns

---

### 1D. Duplicate Detection — NOT STARTED

Metadata-based fuzzy matching to detect potential duplicate tracks within a catalog. Prevents accidental re-uploads.

**Planned:**
- Title + artist + duration fuzzy matching
- Duplicate candidate review queue
- Confirm or dismiss candidates
- Table: `duplicate_candidates`
- Future: audio fingerprinting (Chromaprint) for acoustic matching

---

### 1E. Audio Quality Checks — NOT STARTED

Validates uploaded audio files for distribution readiness using file header analysis.

**Planned:**
- Sample rate (44.1kHz+ required), bit depth (16-bit min), channels
- Duration sanity checks
- Distribution readiness assessment
- Dependency: `music-metadata` npm package
- Extends: `tracks` table with `sample_rate`, `bit_depth`, `channels`, `audio_quality_score`

---

## Phase 2: Rights & Documentation

**Goal:** Generate legally meaningful documents from captured data.

### 2A. PDF Split Sheet Generation — NOT STARTED
Professional PDF output from splits data with legal language, signature lines, and standard formatting. Template-based (HTML → PDF via puppeteer or pdfkit).

### 2B. Contributor Agreements & Work-for-Hire — NOT STARTED
AI pre-filled contributor agreements, producer agreements, work-for-hire documents. Preview before PDF generation. Should consult music attorney for template language.

### 2C. Rights Graph (Chain of Title) — NOT STARTED
Machine-readable ownership map: who owns what % of which rights (composition vs master) per track per territory. Foundation for DDEX (Phase 4) and royalty calculations (Phase 6). Tables: `rights_holders`, `rights_grants`.

### 2D. Chain-of-Title Document Generation — NOT STARTED
Formal chain-of-title PDF from rights graph. Used for sync licensing, catalog sales, legal due diligence.

---

## Phase 3: Identity & Trust

**Goal:** Multi-user auth + identity verification.

### 3A. Multi-User Auth & Sessions — NOT STARTED
Replace single-artist model with users, JWT sessions, roles (owner/collaborator/admin). **Major refactor**: `artist` table → `users`, add `user_id` FK to all downstream tables. Dependencies: `bcrypt`, `jsonwebtoken`.

### 3B. Artist / Label KYC — NOT STARTED
Identity data collection, document upload, verification status tracking. Requires third-party verification service (Stripe Identity, Persona) for actual verification.

### 3C. Account Reputation & Fraud Signals — NOT STARTED
Trust score (0-100) from behavioral signals: account age, release quality, upload patterns. Gates access to advanced features. Tables: `reputation_scores`, `fraud_signals`.

### 3D. Collaborator Invitations — NOT STARTED
Invite collaborators to platform, cryptographic split confirmation, verified representative flows. Requires email service (SendGrid/SES).

---

## Phase 4: Industry Standards (DDEX + ISRC)

**Goal:** Output industry-standard data formats for interoperability.

### 4A. Proper ISRC Registrant Management — NOT STARTED
Replace random ISRC generation with registrant prefix management. Immutable issuance log, duplicate prevention, format validation (ISO 3901). Requires RIAA registration for platform-managed prefix.

### 4B. DDEX ERN Message Creation — NOT STARTED
Canonical model → DDEX ERN 4.3 XML. Maps releases → ReleaseList, tracks → ResourceList/SoundRecording, rights → DealList. XSD validation. Dependencies: `xmlbuilder2`, `libxmljs2`. **Largest single piece of work** — DDEX spec is hundreds of pages.

### 4C. UPC/EAN Management — NOT STARTED
Release-level unique codes, user-provided or platform-managed. Requires GS1 membership ($250/yr) for platform-managed codes.

### 4D. Copyright Office eCO Prep — NOT STARTED
Generate eCO-compatible data packages and deposit copy packaging. Extends existing copyright AI filing prep.

---

## Phase 5: Distribution & Delivery

**Goal:** Move from status tracking to actual delivery infrastructure.

### 5A. Distribution Partner Configuration — NOT STARTED
Configurable partner profiles: SFTP credentials, required formats, metadata mappings. Tables: `distribution_partners`, `delivery_jobs`. Requires business agreements with distributors.

### 5B. Delivery Packaging Engine — NOT STARTED
Assemble DDEX XML + audio + artwork into partner-required directory structure. Transcoding, image resizing, ZIP packaging. Dependencies: `archiver`, `sharp`, `ffmpeg` (runtime).

### 5C. Takedown & Correction Workflows — NOT STARTED
Post-delivery corrections and takedowns. Generates DDEX update/takedown messages. Table: `distribution_actions`.

### 5D. Delivery Status Webhooks — NOT STARTED
Receive/poll partner status updates, auto-update distribution status. Table: `webhook_events`.

---

## Phase 6: Royalty & Financial Engine

**Goal:** Track money flowing back from distributed music.

### 6A. Royalty Statement Ingestion — NOT STARTED
Parse distributor statements (CSV, XLSX). Map columns to canonical schema. ISRC-based track matching. AI-assisted column mapping for new formats. Tables: `royalty_statements`, `royalty_line_items`, `statement_mapping_templates`. Dependencies: `xlsx`, `csv-parse`.

### 6B. Split Calculation Engine — NOT STARTED
Apply rights graph to royalty line items, per-person accrual records. Handles composition vs master, territory-specific splits. Tables: `royalty_calculations`, `royalty_accruals`.

### 6C. Dispute Workflows — NOT STARTED
Collaborators dispute calculations, freeze affected accruals, resolution tracking. Table: `royalty_disputes`.

### 6D. Payout Integration (Data Layer) — NOT STARTED
Payment method collection, balance tracking, payout requests. Data layer only — actual money movement requires Stripe Connect. Tables: `payout_methods`, `payout_requests`.

---

## External Dependencies Summary

| Feature | External Dependency |
|---------|-------------------|
| 3B KYC | Stripe Identity / Persona |
| 3D Invitations | Email service (SendGrid/SES) |
| 4A ISRC prefix | RIAA registration |
| 4C UPC codes | GS1 membership ($250/yr) |
| 5A-5D Distribution | Distributor business agreements |
| 6A Statements | Per-distributor format mapping |
| 6D Payouts | Stripe Connect |

Everything else is **fully solo-buildable**.

---

## Foundation Services (Pre-Phase 1)

These three services were built before Phase 1A and underpin everything:

### Domain Events (`src/services/events/`)
- `domain_events` table — audit trail for all entity changes
- 30+ event type constants covering the full lifecycle
- `eventsService.record(EVENT_TYPE, entityType, entityId, payload)`
- Currently wired into: releases, tracks, validation, normalization

### Decisions Engine (`src/services/decisions/`)
- `decisions` table — separates scores from outcomes
- Outcomes: `approved`, `flagged`, `blocked`, `pending_review`
- `decisionsService.decide()` evaluates rules against scores
- Override support for admin overrides
- Currently used by: validation engine (release readiness)

### Identifiers Registry (`src/services/identifiers/`)
- `identifiers` table — unified registry for ISRC, UPC, ISWC, IPI, ISNI
- Uniqueness enforcement at DB level
- Immutable issuance with revocation support
- Currently used by: ISRC assignment

---

## Test Coverage

| Phase | Suite | Tests |
|-------|-------|-------|
| 1A | Validation Engine | 73 |
| 1A | Validation Controller | 7 |
| 1A | Validation API Integration | 10 |
| 1B | Normalization Engine | 68 |
| 1B | Normalization Controller | 14 |
| 1B | Normalization API Integration | 16 |
| **Total** | | **188** |

---

## Database Migrations

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 001 | `001_initial_schema.sql` | MVP | Core tables (releases, tracks, collaborators, splits, copyrights, etc.) |
| 002 | `002_foundation.sql` | Pre-1A | domain_events, identifiers, decisions |
| 003 | `003_validation.sql` | 1A | validation_rules, validation_runs, validation_results + 14 seed rules |
| 004 | `004_normalization.sql` | 1B | genre_taxonomy, normalization_runs, normalization_suggestions + 68 genre seeds |

---

## Git History

```
95371ac Phase 1B: Metadata Normalization Pipeline
125f04d Phase 1A: Metadata Validation Rules Engine
7fa299b Initial commit: TrackRail MVP + foundation architecture
```

Repository: `git@github.com:redroostertech/TrackRail.git` (branch: `development`)
