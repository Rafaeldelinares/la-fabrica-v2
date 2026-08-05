# SEO Local Module — CRM ByBusiness

## Architecture Overview

```
┌─────────────────────────┐       SSH tunnel        ┌──────────────────────────────┐
│   Local Node            │  (localhost:5433 ←→    │   VPS 72.60.191.179          │
│   /opt/fabrica          │   localhost:5432)       │   crm_bybusiness DB           │
│                         │                         │                              │
│  seo_local_engine.py    │◄──── psycopg2 ─────────►│  Schema: seo                 │
│  + Playwright           │                         │  ├── locations               │
│  + Persistent contexts  │                         │  ├── job_queue              │
│    (/var/lib/fabrica/   │                         │  ├── audit_runs             │
│     playwright-seo/)     │                         │  ├── nap_baseline           │
│                         │                         │  └── admin_alerts            │
└─────────────────────────┘                         └──────────────────────────────┘
```

- **VPS PostgreSQL** holds all schema and data — the canonical source of truth.
- **Local node** reads `job_queue`, executes Playwright scrapes, writes results back.
- **SSH tunnel** forwards `localhost:5433 → VPS:5432` (must be active before running the engine).
- **Per-CID persistent Playwright contexts** store cookies/consent state to reduce ban friction.

---

## Phase 1 Status

| Feature | Status | Notes |
|---------|--------|-------|
| `seo.locations` table | ✅ Done | Stores Google CID + keywords + audit frequency |
| `seo.job_queue` table | ✅ Done | FOR UPDATE SKIP LOCKED for multi-instance safety |
| `seo.audit_runs` table | ✅ Done | Full trazabilidad |
| `seo.nap_baseline` table | ✅ Done | Silent baseline capture on first audit |
| `seo.admin_alerts` table | ✅ Done | NAP_CHANGE alerts wired up |
| `AUDIT_PROFILE` job type | ✅ Done | Full NAP extraction + consent handling |
| `SERP_KEYWORD` job type | ✅ Done | Phase 4 — Playwright + stealth, top 20, alerts |
| `seo.keywords` table | ✅ Done | Phase 4 — keywords tracked per location |
| `seo.serp_positions` table | ✅ Done | Phase 4 — historical SERP positions |
| Auto-seed trigger (keywords) | ✅ Done | Phase 4 — from locations.target_keywords[0] |
| Auto-enqueue trigger (SERP jobs) | ✅ Done | Phase 4 — on keyword activation |
| `PULL_REVIEWS` job type | 🔲 Pending | Phase 2 |
| `RANKING_GRID` job type | 🔲 Pending | Phase 3 |
| `UPDATE_NAP_BASELINE` job type | 🔲 Pending | Phase 2 |
| `--loop` daemon mode | ✅ Done | |
| `--seed` mode | ✅ Done | |
| `--once` mode | ✅ Done | |

---

## Scope: Clients Only (Not Leads)

The SEO Local module tracks **only converted clients**, not pending leads. The flow is:

1. Lead exists in `operaciones.leads` (estado='pendiente')
2. Lead converts → row created in `clientes` table
3. **Automatic**: PostgreSQL trigger `seo.fn_auto_register_client_location` creates the `seo.locations` entry when `google_cid` is populated and `estado='activo'`
4. Local node audits periodically, alerts on NAP changes / bad reviews

**Why this restriction**: SEO Local is a paid service offered by the agency. Only clients paying for SEO management get monitoring. Leads in the pipeline are evaluated OUTREACH-first; once they become clients, they become SEO candidates.

### Auto-registration flow

When a client (in `clientes.clientes`) has `google_cid` populated AND `estado='activo'`, a PostgreSQL trigger `seo.fn_auto_register_client_location` automatically creates a corresponding entry in `seo.locations`. No manual SQL needed.

**Trigger fires on**:
- INSERT of a new client with google_cid
- UPDATE of google_cid on an existing client
- UPDATE of estado from non-active to 'activo'

**Existing clients** were migrated by running `docs/seo_seed_from_clientes.sql` (one-shot, 2026-08-05, 22 clients migrated).

**To opt-out**: set `seo.locations.is_monitored = FALSE` for that specific location.

**Manual override**: to add a client without google_cid, or to pre-configure keywords/lat/lng, insert directly:
```sql
INSERT INTO seo.locations (client_id, google_cid, business_name, target_keywords, latitude, longitude)
VALUES (
    <cliente_id>,  -- MUST be a valid id from clientes table
    '<google_cid>',
    '<business_name>',
    ARRAY['<keyword1>', '<keyword2>'],
    <lat>,
    <lng>
);
```

---

## Setup Instructions

### 1. SSH Tunnel

Start the tunnel before running the engine:

```bash
# Persistent tunnel with autossh
autossh -M 0 -f -N -L 5433:localhost:5432 root@72.60.191.179

# Verify tunnel is up
psql -h localhost -p 5433 -U rafael_admin -d crm_bybusiness -c "SELECT 1"
```

Or with plain SSH (run in background):

```bash
ssh -f -N -L 5433:localhost:5432 root@72.60.191.179
```

### 2. Environment Variables

```bash
export VPS_HOST=72.60.191.179
export VPS_USER=root
export VPS_DB_HOST=localhost      # SSH tunnel endpoint
export VPS_DB_PORT=5433          # local port of SSH tunnel
export VPS_DB_NAME=crm_bybusiness
export VPS_DB_USER=rafael_admin
export VPS_DB_PASSWORD=<password> # from 1Password or env
```

### 3. Playwright Persistent Context Directory

```bash
sudo mkdir -p /var/lib/fabrica/playwright-seo
sudo chown $(whoami) /var/lib/fabrica/playwright-seo
```

One storage file is created per CID: `cid_<safe_cid>.json`.

### 4. Apply the Migration

```bash
# Copy migration to VPS
scp /opt/fabrica/docs/seo_local_migration.sql root@72.60.191.179:/tmp/

# Apply
ssh root@72.60.191.179 \
  "docker exec -i fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness \
   < /tmp/seo_local_migration.sql"

# Verify
ssh root@72.60.191.179 \
  "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -Atc \
   \"SELECT table_name FROM information_schema.tables WHERE table_schema='seo' ORDER BY table_name;\""
```

Expected output:
```
admin_alerts
audit_runs
job_queue
locations
nap_baseline
```

---

## Usage

### Seed the job queue

Creates AUDIT_PROFILE jobs for all monitored locations that are overdue:

```bash
python3 scripts/seo_local_engine.py --seed
```

### Process one job (dry-run friendly)

```bash
python3 scripts/seo_local_engine.py --once
```

### Run continuously

```bash
python3 scripts/seo_local_engine.py --loop
```

### Debug with visible browser

```bash
python3 scripts/seo_local_engine.py --once --headed
```

---

## Schema Overview

### `seo.locations`
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `client_id` | INT | Loose ref to `clientes` (no FK constraint) |
| `google_cid` | VARCHAR(64) | Google CID, UNIQUE |
| `business_name` | VARCHAR(255) | Display name |
| `target_keywords` | TEXT[] | Keywords for ranking tracking |
| `latitude`, `longitude` | DECIMAL | Geo coordinates |
| `is_monitored` | BOOLEAN | Include in audit cycle |
| `audit_frequency_hours` | INT | How often to audit (default 24) |
| `last_audit_at` | TIMESTAMPTZ | Last successful audit |

### `seo.job_queue`
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `location_id` | INT | FK → `seo.locations` |
| `google_cid` | VARCHAR(64) | Redundant denorm for join elimination |
| `job_type` | VARCHAR(50) | AUDIT_PROFILE / SERP_KEYWORD / PULL_REVIEWS / RANKING_GRID / UPDATE_NAP_BASELINE |
| `status` | VARCHAR(20) | pending / running / done / failed / skipped |
| `priority` | INT | 1 (highest) – 10 (lowest) |
| `scheduled_for` | TIMESTAMPTZ | When to run (default NOW) |
| `started_at`, `completed_at` | TIMESTAMPTZ | Trazabilidad |
| `error` | TEXT | Error message if failed |
| `result_summary` | JSONB | Structured result (run_id, alerts_created, etc.) |

### `seo.audit_runs`
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `location_id` | INT | FK → `seo.locations` |
| `google_cid` | VARCHAR(64) | Denormalized |
| `started_at`, `finished_at` | TIMESTAMPTZ | Timing |
| `fields_scraped` | TEXT[] | Which NAP fields were successfully extracted |
| `pages_visited` | INT | Pages scraped in this job |
| `duration_seconds` | INT | Wall time |
| `consent_clicked` | BOOLEAN | Whether consent dialog was handled |
| `exit_reason` | VARCHAR(50) | success / consent_block / not_found / timeout / error |
| `raw_data` | JSONB | Full extracted data + internal fields |

### `seo.nap_baseline`
Stores the last known NAP state for each location. Compared after each audit to detect changes.

### `seo.keywords`
See Phase 4 section above.

### `seo.serp_positions`
See Phase 4 section above.

### `seo.admin_alerts`
| Column | Type | Description |
|--------|------|-------------|
| `alert_type` | VARCHAR(50) | BAD_REVIEW / NAP_CHANGE / RANK_DROP / NEW_REVIEW / PROFILE_INCOMPLETE / AUDIT_FAILED |
| `is_resolved` | BOOLEAN | Resolved flag |
| `resolved_at`, `resolved_by` | TIMESTAMPTZ/INT | Resolution tracking |

---

## How to Add New Locations

```sql
-- Insert a new location
INSERT INTO seo.locations
  (client_id, google_cid, business_name, target_keywords, latitude, longitude)
VALUES
  (NULL, '0xYOUR_CID_HERE', 'Business Name', ARRAY['keyword1', 'keyword2'],
   39.5696, 2.6502)
ON CONFLICT (google_cid) DO NOTHING;

-- Immediately seed a job for it
INSERT INTO seo.job_queue (location_id, google_cid, job_type, priority, scheduled_for)
SELECT l.id, l.google_cid, 'AUDIT_PROFILE', 5, NOW()
FROM seo.locations l
WHERE l.google_cid = '0xYOUR_CID_HERE'
ON CONFLICT (location_id, job_type, scheduled_for) DO NOTHING;
```

Or simply run `--seed` — it creates jobs for all monitored locations whose `last_audit_at` is older than `audit_frequency_hours`.

---

## Phase Roadmap

### Phase 2: Review Pulling
- `PULL_REVIEWS` job type — paginate through review list, extract:
  - Reviewer name, star rating, date, text
  - Store in `seo.reviews` table (new)
- `UPDATE_NAP_BASELINE` job type — force refresh baseline without full audit
- `BAD_REVIEW` alert when a new 1-2 star review appears

### Phase 3: Geo Grid Rankings
- `RANKING_GRID` job type
- Track keyword rankings across geo grid (center + surrounding cells)
- Store in `seo.rankings` table (new)
- `RANK_DROP` alert when position drops below threshold

### Phase 4: Organic SERP Keyword Tracking
**Status: ✅ Backend done (Phase 4 Batch 1)**

#### Architecture
- **Playwright + `playwright-stealth`** (2.0.3) for anti-detection
- **New browser context per keyword** — incognito-like, no cookies
- **URL params**: `pws=0&gl=es&hl=es` (no personalization, Spanish results)
- **Top 20 tracking** — 2 SERP pages queried (positions 1-10 and 11-20)
- **Frequency**: 1/day per keyword (random hour via scheduled_for jitter)

#### Schema

**`seo.keywords`** — keywords tracked per client location
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `location_id` | INT | FK → `seo.locations` |
| `client_id` | INT | Denormalized for fast queries |
| `keyword` | VARCHAR(200) | Search term |
| `target_domain` | TEXT | Client's website URL |
| `is_active` | BOOLEAN | Include in scrape cycle |
| `priority` | INT | 1 (highest) – 10 (lowest) |
| `created_at`, `updated_at` | TIMESTAMPTZ | Timestamps |

Auto-seeded from `locations.target_keywords[0]` via trigger on INSERT/UPDATE.

**`seo.serp_positions`** — historical SERP positions
| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `keyword_id` | INT | FK → `seo.keywords` |
| `client_id` | INT | Denormalized |
| `position` | INT | 1–100, NULL = not in top 100 |
| `page` | INT | 1 (top 10) or 2 (11-20) |
| `url_found` | TEXT | Actual URL ranking for this keyword |
| `title` | TEXT | Google result title |
| `scraped_at` | TIMESTAMPTZ | When scraped |

#### Job Handler Flow
```
claim_job() → SERP_KEYWORD job
  → fetch keyword + target_domain from seo.keywords
  → launch new browser context (playwright-stealth applied)
  → scrape_serp_for_keyword(page, keyword, target_domain)
      → navigate Google SERP with pws=0&gl=es&hl=es
      → parse top 10 results (page 1)
      → if target_domain not found → fetch page 2 (positions 11-20)
      → domain-matched against target_domain
      → return position (1-20) or None
  → INSERT seo.serp_positions (position, page, url_found, title)
  → check_serp_alerts() — two-tier
  → complete_job(done)
```

#### Alert Thresholds
| Level | Condition | Action |
|-------|-----------|--------|
| **CRITICAL** | Position drops >5 in 1 day | Insert `RANK_DROP` alert |
| **CRITICAL** | Position > 20 (exits top 20) | Insert `RANK_DROP` alert |
| **WARNING** | Drop >3 vs 7-day average | Insert `RANK_DROP` alert |

#### Auto-enqueue Trigger
When a keyword is created or activated, `trg_auto_enqueue_serp_job` fires and inserts a `SERP_KEYWORD` job with `scheduled_for = NOW() + random(0-15 min)` to spread load.

#### Tuning Notes
- **Personalization**: `pws=0` disables Google account personalization. `gl=es&hl=es` forces Spanish/Spain results.
- **Anti-detection**: `playwright-stealth` patches `navigator.webdriver`, `navigator.plugins`, `chrome.runtime`, etc. Also sets `--disable-blink-features=AutomationControlled` launch arg.
- **Storage state**: context state is persisted per-keyword at `/var/lib/fabrica/playwright-seo/serp_{keyword_id}.json` — reduces consent dialog friction on repeat runs.
- **SERP selectors**: the JS extraction uses multiple fallback selectors (`div.g`, `div.MjjYud`, etc.) to handle Google UI changes.

#### Known Limitations
- No CAPTCHA handling (Google may still detect; rate-limit if seeing 403s)
- Position is based on organic result order — may shift if Google adds knowledge panels, ads, or featured snippets above results
- Domain matching is hostname-only — `https://example.com/page` and `https://example.com/other` both match `example.com`

### Phase 5: Reporting & Dashboard
- KPI summaries (average rating, review velocity, ranking trends)
- Integration with existing CRM dashboards

### Phase 6 — CRM UI Integration (future)
- "Add to SEO monitoring" button in `ClienteDrawer.jsx` (clientes side panel) — only shown if the cliente doesn't already have a seo.locations entry
- Display the seo.locations health inline: last_audit_at, NAP baseline diff, open alerts
- Manual override: allow toggling is_monitored from the CRM

---

## Troubleshooting

### "No pending jobs" when running `--once`
- Run `--seed` first to create jobs
- Or check `last_audit_at` — if recent, location isn't due yet

### Browser timeout / not_found exit_reason
- The CID may be invalid or the Google Maps page structure changed
- Check with `--headed` mode to observe the browser

### SSH tunnel drops
- Use `autossh` with `-f` for automatic restarts
- Or run tunnel in a systemd service

### Consent dialog keeps appearing
- The per-CID persistent context should store consent state after the first accept
- If it keeps appearing, the storage state file may be corrupted — delete it:
  ```bash
  rm /var/lib/fabrica/playwright-seo/cid_<safe_cid>.json
  ```
