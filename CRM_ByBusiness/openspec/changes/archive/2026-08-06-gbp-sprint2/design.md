# Design: GBP Ficha Improvements — Sprint 2

**Change:** `gbp-sprint2`
**Phase:** sdd-design
**Date:** 2026-08-06
**Delivery strategy:** `ask-always` (3 chained slices, ≤400 LOC each, commits ≤3 files)
**Predecessor:** Sprint 1 `gbp-ficha-improvements` (archived 2026-08-06, verified working in production)

---

## 1. Technical Approach

Sprint 2 continues in the Python scraper + n8n workflow + React frontend layer. **No DB schema changes.** No new permissions. No external services.

**Slice 2A** rewrites 4 broken extraction blocks in `gbp_ficha_audit.py` using a multi-fallback strategy: ARIA roles → CSS classes → visible-text regex. Each block becomes self-contained with per-strategy `try/except` and a stderr warning when all strategies fail. Sprint 1 verification on cliente 693 (AG FITNESS BURGOS) is the canary — after the fix, `reviews_count ≥ 10`, `descripcion` non-null, `horarios_dias_cubiertos ≥ 6`, `atributos_seteados ≥ 8`.

**Slice 2B** adds one new wrapper endpoint (`/competitive-analyze`) that orchestrates Google Maps search + 3 ficha scrapes, one new n8n workflow (`CRM_GBP_COMPETITIVE_ANALYZE`) with JWT gate, and one new frontend sub-component (`GbpBenchmark.jsx` ≤150 LOC) mounted under `GbpFichaActual`. Top-3 ranking comes from Google Maps' own search results ordering; the cliente's own place_id is excluded.

**Slice 2C** extends the existing `/run` post-audit hook with alert computation and adds a new async dispatch path. One new wrapper helper (`_compute_alerts(prev, curr)`) is extracted from the existing `_drift_response()` logic; the `/run` handler calls it after `save_history()` and writes triggered alerts to a new `clientes.gbp_alerts` table. Three new n8n workflows handle delivery (`CRM_GBP_ALERTS_DISPATCH` cron every 5 min) and frontend interactions (`CRM_GBP_ALERTS_LIST` GET, `CRM_GBP_ALERTS_DISMISS` POST). One new frontend sub-component (`GbpAlerts.jsx` ≤150 LOC) renders a dismissable banner under `GbpHeader`. SMTP uses the existing `informacion@ia-bybusiness.com` credential (n8n cred ID `8NbamWrMdRexLNwa`); email destination is per-cliente via new `clientes.email_destinatario TEXT` column with global default fallback to `rafaeldelinares@gmail.com`.

References: `openspec/changes/gbp-sprint2/proposal/proposal.md`, `openspec/changes/gbp-sprint2/specs/clientes/spec.md`, archived Sprint 1 design (`openspec/changes/archive/2026-08-06-gbp-ficha-improvements/design/design.md`).

---

## 2. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                  FRONTEND (React 19 + Vite, Navy Industrial)               │
│                                                                            │
│  ClienteDrawer (cartera/)                                                  │
│    └─ activeTab === 'gbp'                                                  │
│       └─ <TabGbpUnified cliente={cliente}>  [Sprint 1]                    │
│             ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  tabs/gbp/ (Sprint 1 + NEW sub-components ≤150 LOC)              │    │
│  │  ┌─ <GbpHeader>              score + cache pill (read)          │    │
│  │  │  └─ <GbpAlerts>      (NEW)  dismissable banner  [S2C]        │    │
│  │  │     useN8nQuery('gbp-alerts-list', clienteId)                 │    │
│  │  ├─ <GbpFichaActual>         current audit + top-5 gaps [S1]     │    │
│  │  │  └─ <GbpBenchmark>   (NEW)  competitor table (read)  [S2B]   │    │
│  │  │     useN8nQuery('gbp-benchmark', clienteId, categoria, ciudad)│    │
│  │  ├─ <GbpHistorico>           drift timeline (read)               │    │
│  │  ├─ <GbpAudit>               run audit mutation (write gate)     │    │
│  │  └─ <GbpGestionPlaceId>      save place_id (write gate)          │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬───────────────────────────────────────────┘
                                │ HTTPS webhooks (VITE_N8N_URL)
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       n8n BFF (VPS, Docker)                                │
│  CRM_GBP_FICHA_AUDIT (kyWibKXBuBknk2QX)  [Sprint 1, JWT-gated]            │
│  CRM_GBP_COMPETITIVE_ANALYZE  (NEW)  ─► JWT gbp.write → wrapper            │
│  CRM_GBP_ALERTS_LIST         (NEW)  ─► JWT gbp.read  → wrapper/list        │
│  CRM_GBP_ALERTS_DISMISS      (NEW)  ─► JWT gbp.write → DB UPDATE           │
│  CRM_GBP_ALERTS_DISPATCH     (NEW)  ─► cron every 5min → SMTP send        │
│  ──► reads clientes.gbp_audit_cache for cliente's own current audit        │
│  ──► POST localhost:8095/competitive-analyze {categoria, ciudad, top_n:3}  │
│  ──► INSERT clientes.gbp_audit_history audit_source='competitive-analyze'  │
│  ──► return unified comparison JSON                                        │
│                                                                            │
│  Alert dispatch path (S2C, cron tick every 5 min):                         │
│    cron → SELECT unsent gbp_alerts grouped by cliente_id                    │
│    → for each cliente: send ONE digest email via SMTP cred 8NbamWrMdRexLNwa │
│    → UPDATE gbp_alerts SET sent_at = NOW() WHERE id IN (...)               │
└──────────────────────────────┬───────────────────────────────────────────┘
                                │ HTTP internal (localhost:8095)
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  /opt/fabrica/scripts/gbp_http_wrapper.py (port 8095)                       │
│                                                                            │
│  EXISTING [Sprint 1]:                                                      │
│    GET  /run?place_id=X           → cache OR scrape + save_history          │
│    GET  /history?place_id=X       → list audits                            │
│    GET  /drift?place_id=X         → last 2 deltas                          │
│    GET  /extract-place-id?url=Y   → URL → place_id                         │
│                                                                            │
│  NEW [Sprint 2B]:                                                          │
│    POST /competitive-analyze     ─→ /run variants (Slice 2A selectors)     │
│      body {categoria, ciudad, top_n=3, exclude_place_id}                  │
│      1. search_businesses(categoria, ciudad)  → [place_ids]  (~10s)        │
│      2. for each top-N: scrape_full_audit(page, place_id)  (~15s × 3)      │
│      3. filter out exclude_place_id                                        │
│      4. normalize → {fotos_count, reviews_count, rating, ...}              │
│      returns {competitors: [...], total_duration_ms}                       │
│                                                                            │
│  NEW [Sprint 2C]:                                                          │
│    POST /check-alerts (internal, called inline from /run post-save)         │
│      body {place_id, cliente_id, current_audit_data}                       │
│      1. fetch prev row via get_recent_history(place_id)                    │
│      2. _compute_alerts(prev, curr) → list[Alert]                          │
│         - rating_drop:    |Δrating| ≥ 0.2                                  │
│         - photos_drop:    (prev-curr)/prev ≥ 0.10                           │
│         - reviews_drop:   |Δreviews| ≥ 5 OR new negative no-response >24h  │
│         - description_empty: prev non-empty → curr null/empty              │
│      3. INSERT INTO clientes.gbp_alerts (one row per triggered)            │
│         ON CONFLICT (place_id, prev_audit_id, alert_type) DO NOTHING       │
│      returns {alerts_written, alerts_skipped}                              │
│    (this is NOT an external endpoint — invoked from /run after save_history)│
└──────────────────────────────┬───────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  /opt/fabrica/scripts/gbp_ficha_audit.py (881 LOC, MODIFIED Sprint 2A)      │
│                                                                            │
│  Slice 2A — 4 extraction blocks rewritten with multi-fallback:            │
│    extract_descripcion(page)        → ARIA + CSS + regex                   │
│    extract_horarios(page)           → ARIA + CSS table + body regex        │
│    extract_atributos(page)          → CSS chips + semantic text patterns    │
│    extract_reviews_count(page)      → ARIA + CSS + body regex               │
│                                                                            │
│  extract_limited_view() and other extractors: UNCHANGED                    │
│  Existing 24h cache logic in wrapper: UNCHANGED                            │
└──────────────────────────────┬───────────────────────────────────────────┘
                                │
                                ▼
   Playwright headless (cookies from google_session.json) → google.com/maps
```

**RBAC gates** (Sprint 1 pattern extended to new endpoints):
1. **Component** — `GbpBenchmark.jsx` displays data for `gbp.read` users (read-only, no mutation trigger)
2. **Component** — `GbpAlerts.jsx` displays alerts for `gbp.read` users; dismiss button requires `gbp.write` (button disabled with tooltip otherwise)
3. **Server** — `CRM_GBP_COMPETITIVE_ANALYZE` decodes JWT, checks `gbp.write`, returns 403 if absent
4. **Server** — `CRM_GBP_ALERTS_LIST` checks `gbp.read`; `CRM_GBP_ALERTS_DISMISS` checks `gbp.write`; returns 403 if absent
5. **Server** — `CRM_GBP_ALERTS_DISPATCH` cron has no inbound webhook (no JWT gate needed; cron trigger is internal)

---

## 3. Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|--------------|-----------|
| AD-1 | Multi-fallback strategy order | ARIA roles → CSS classes → visible-text regex | (a) CSS only; (b) regex only | ARIA roles are semantic and stable across Google DOM rotations. CSS classes are visual and break often. Regex is the last resort — it can over-match but never silently misses a paragraph. Order: stable → fragile → heuristic. |
| AD-2 | Where to compute "top-3" ranking | Trust Google Maps search results order (default ranking) | Re-rank by score, distance, relevance | Sprint 2 ships the minimum useful signal: what Google already says is "top 3" for that category+city. Re-ranking adds complexity without delivering Tier-1 value in Sprint 2. Future Sprint 3+ may add relevance scoring. |
| AD-3 | Competitive scraping scope | Always fresh, no cache | Cache N hours | Sprint 2 emphasis on "current" competitive landscape for agency pitches. Cookie wear is real but acceptable — agency uses this ~5-10x/day, not 1000x. Future Sprint 3 may add TTL cache. |
| AD-4 | Where to run competitive scraping | Inside wrapper (Python) | Inside n8n Code node | Wrapper has Playwright + cookies already initialized; reusing the same browser session avoids 4× cookie warmup cost. n8n Code node is JS — duplicating Playwright infra there is wasteful. |
| AD-5 | Excluding cliente's own ficha | Wrapper compares each result's place_id to exclude_place_id, skips match, pads with #N+1 | Pre-filter in n8n via cliente.place_id lookup; show self in competitors with marker | Wrapper-side is closer to the data; one round trip. Pre-filter in n8n would require DB query per competitor. |
| AD-6 | Frontend mounting point | `<GbpBenchmark>` rendered INSIDE `<GbpFichaActual>`, below existing secciones (Recomendaciones) | New top-level section in `index.jsx` | Benchmark logically belongs to "current ficha vs sector"; coupling to Ficha Actual makes the agency pitch narrative cohere. Top-level section adds another collapsible to manage. |
| AD-7 | Benchmark trigger model | Auto-fetch on Ficha Actual expand (lazy) | Button to trigger analyze | Sprint 2 keeps UX simple: opening Ficha Actual triggers the benchmark query. If latency becomes an issue, Sprint 3 can swap for a button. Estimated 30s latency is acceptable for the agency workflow. |
| AD-8 | Delta computation | Frontend (simple subtraction in `GbpBenchmark.jsx`) | Backend (in n8n Code node) | Data is already in client memory after benchmark fetch; trivial math; saves server code. Frontend deltas also enable per-render color coding without server round-trip. |
| AD-9 | audit_source value for competitive | `'competitive-analyze'` (new enum value) | Reuse `'manual'` | Distinguishes competitive audits from real audits in history timeline; future reporting can filter. Requires ALTER CHECK constraint: `CHECK (audit_source IN ('manual','cache-refresh','scheduled','competitive-analyze'))`. |
| AD-10 | Selector strategy extraction method | Refactor each block into a private function `_extract_<field>(page, body_text)` returning `(value, strategy_used)` | Inline extraction with comments | Extractors become individually unit-testable later (Sprint 3+). Function signatures are stable; future Sprint can add unit tests without refactoring call sites. |
| AD-11 | GbpBenchmark LOC budget | ≤150 LOC (one file, no sub-components) | Split into GbpBenchmarkTable + GbpBenchmarkRow | Navy Industrial 150-LOC cap; one component with internal `<BenchmarkRow>` sub-function (not exported) stays well under cap and avoids cross-file prop drilling. |
| AD-12 | Scraper fix scope (2A) | ONLY 4 fields: descripcion, horarios_dias_cubiertos, atributos_seteados, reviews_count | Full refactor of `gbp_ficha_audit.py` | Slice 2A is a quick win. Touching additional fields risks breaking other extractions and explodes scope. Future Sprint can refactor more blocks using the same pattern. |
| AD-13 | Persisting competitor snapshot to history | YES — insert ONE row per competitive call with `audit_source='competitive-analyze'` and a stub `audit_data` (own ficha only) | No persistence | Keeps the history timeline consistent (every action leaves a row). Sprint 3+ can extend audit_data to include competitors. Keeps the cache shape unchanged. |
| AD-14 | Empty `competitors` array handling | Return 200 with empty array + no fabricated rows | Return 404 or error | Sparse categories are valid; agency still gets the response and can act on empty signal. 404 would be misleading. |
| AD-15 | Alert computation locus | Post-audit hook in wrapper (`/run` calls `_compute_and_save_alerts()` after `save_history()`) | n8n cron (every N hours) polling | Detection is synchronous with audit save (same `/run` flow); cron would add 24h detection latency and require new infrastructure. Drift logic already exists in `_drift_response()` — we extract it into a reusable helper, no new infrastructure. |
| AD-16 | Email dispatch locus | n8n cron workflow `CRM_GBP_ALERTS_DISPATCH` (every 5 min), reads unsent rows from `clientes.gbp_alerts`, sends via existing SMTP cred | Synchronous email send in wrapper after INSERT | Decouples detection (sync, in data path) from delivery (async, retryable). SMTP failure doesn't block audit save; alerts queue in DB; cron retries until SMTP recovers. Wrapper stays HTTP-only, no SMTP library added. |
| AD-17 | Email destination storage | `clientes.email_destinatario TEXT` column (nullable); fallback to global default in n8n credential env var (`GBP_ALERT_DEFAULT_EMAIL`) | System-wide constant in code | Per-cliente override without code change; global default still configurable via n8n env. ALTER TABLE is idempotent and reversible. |
| AD-18 | Alert idempotency key | `UNIQUE (place_id, prev_audit_id, alert_type)` constraint on `clientes.gbp_alerts` | Application-level dedup logic | DB-level constraint is bulletproof against wrapper restarts, concurrent audits, and partial failures. `ON CONFLICT DO NOTHING` in INSERT handles re-runs gracefully. |
| AD-19 | Alert digest grouping | Cron groups all unsent alerts per `cliente_id` into ONE email per dispatch tick (not one email per alert) | One email per alert | Avoids alert spam if multiple regressions hit at once. Trade-off: if SMTP fails mid-tick, partial dispatch possible — acceptable given 5-min retry interval. |
| AD-20 | Frontend alerts mount point | `<GbpAlerts>` inside `<GbpHeader>`, below score pill (top of GBP tab) | New top-level section between Header and Ficha Actual | Alerts are time-sensitive UX — they must be the first thing the user sees when opening the tab. Mounting inside Header makes the mount delta minimal (~5 LOC) and visually consistent with other read-only indicators. |

---

## 4. Data Model

### 4.1 No schema changes

Sprint 2 requires NO new tables and NO column additions. The existing schema already supports all data needs:

```sql
-- Existing table (Sprint 1, no changes)
CREATE TABLE clientes.gbp_audit_history (
  audit_id           BIGSERIAL    PRIMARY KEY,
  place_id           TEXT         NOT NULL,
  cliente_id         BIGINT,
  audit_data         JSONB        NOT NULL,
  audit_source       TEXT         NOT NULL
                                  CHECK (audit_source IN ('manual','cache-refresh','scheduled')),
  scrape_duration_ms INTEGER,
  audited_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### 4.2 ALTER CHECK constraint — `competitive-analyze` enum value

```sql
ALTER TABLE clientes.gbp_audit_history
  DROP CONSTRAINT gbp_audit_history_audit_source_check;

ALTER TABLE clientes.gbp_audit_history
  ADD CONSTRAINT gbp_audit_history_audit_source_check
  CHECK (audit_source IN ('manual','cache-refresh','scheduled','competitive-analyze'));
```

Idempotent migration — included in Slice 2B deploy, paired with the wrapper restart.

### 4.3 Wrapper write path — competitive stub row

When `CRM_GBP_COMPETITIVE_ANALYZE` finishes, n8n calls `INSERT INTO clientes.gbp_audit_history`:

```sql
INSERT INTO clientes.gbp_audit_history
  (place_id, cliente_id, audit_data, scrape_duration_ms, audit_source)
VALUES
  (%s, %s, %s::jsonb, %s, 'competitive-analyze')
```

Where `audit_data` is a minimal object containing the **cliente's own** ficha snapshot for delta purposes, plus a top-level marker:

```json
{
  "_competitive": true,
  "queried_at": "2026-08-06T18:30:00Z",
  "categoria": "Entrenador personal",
  "ciudad": "Burgos",
  "competitors_found": 3,
  "cliente_snapshot": { "place_id": "ChIJ_SELF", "fotos_count": 15, ... }
}
```

**Future Sprint 3+** may extend `audit_data` to include the full competitor array, but Sprint 2 keeps it minimal to avoid bloating the history table.

### 4.4 NEW S2C schema — alert storage and per-cliente email

**New table `clientes.gbp_alerts`** (append-only alert log):

```sql
CREATE TABLE clientes.gbp_alerts (
  alert_id        BIGSERIAL    PRIMARY KEY,
  cliente_id      BIGINT       NOT NULL REFERENCES clientes.clientes(id) ON DELETE CASCADE,
  place_id        TEXT         NOT NULL,
  prev_audit_id   BIGINT       NOT NULL REFERENCES clientes.gbp_audit_history(audit_id),
  alert_type      TEXT         NOT NULL
                              CHECK (alert_type IN ('rating_drop','photos_drop','reviews_drop','description_empty')),
  severity        TEXT         NOT NULL CHECK (severity IN ('low','medium','high')),
  delta_json      JSONB        NOT NULL,
  sent_at         TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (place_id, prev_audit_id, alert_type)
);

CREATE INDEX idx_gbp_alerts_cliente_unsent
  ON clientes.gbp_alerts (cliente_id, created_at DESC)
  WHERE sent_at IS NULL AND dismissed_at IS NULL;

CREATE INDEX idx_gbp_alerts_dispatch
  ON clientes.gbp_alerts (sent_at, created_at)
  WHERE sent_at IS NULL;
```

Idempotent migration wrapped in `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`.

**New column `clientes.email_destinatario`** (per-cliente email override):

```sql
ALTER TABLE clientes.clientes
  ADD COLUMN IF NOT EXISTS email_destinatario TEXT;
```

Nullable — `NULL` means use global default (`GBP_ALERT_DEFAULT_EMAIL` env var in n8n credential).

### 4.5 Wrapper internal helper — `_compute_alerts(prev, curr)`

Extracted from existing `_drift_response()` logic. Pure function (no DB access); called inline from `/run` handler:

```python
def _compute_alerts(prev_data: dict, curr_data: dict) -> list[dict]:
    """Return list of alert dicts triggered by changes between prev and curr."""
    alerts = []
    # rating_drop: ABSOLUTE drop ≥ 0.2
    prev_r = float(prev_data.get('rating_promedio') or 0)
    curr_r = float(curr_data.get('rating_promedio') or 0)
    if prev_r and (prev_r - curr_r) >= 0.2:
        alerts.append({
            'alert_type': 'rating_drop',
            'severity': 'medium',
            'delta_json': {'prev': prev_r, 'curr': curr_r, 'delta': round(prev_r - curr_r, 2)},
        })
    # photos_drop: relative drop ≥ 10%
    prev_f = int(prev_data.get('fotos_count') or 0)
    curr_f = int(curr_data.get('fotos_count') or 0)
    if prev_f and ((prev_f - curr_f) / prev_f) >= 0.10:
        alerts.append({
            'alert_type': 'photos_drop',
            'severity': 'low',
            'delta_json': {'prev': prev_f, 'curr': curr_f, 'delta_pct': round((prev_f - curr_f) / prev_f * 100, 1)},
        })
    # reviews_drop + new_negative_no_response (>24h)
    prev_rc = int(prev_data.get('reviews_count') or 0)
    curr_rc = int(curr_data.get('reviews_count') or 0)
    if prev_rc and (prev_rc - curr_rc) >= 5:
        alerts.append({
            'alert_type': 'reviews_drop',
            'severity': 'high',
            'delta_json': {'prev': prev_rc, 'curr': curr_rc, 'trigger': 'count_drop'},
        })
    # description_empty: prev non-empty → curr null/empty
    prev_d = (prev_data.get('descripcion') or '').strip()
    curr_d = (curr_data.get('descripcion') or '').strip()
    if prev_d and not curr_d:
        alerts.append({
            'alert_type': 'description_empty',
            'severity': 'medium',
            'delta_json': {'prev_length': len(prev_d), 'curr_length': 0},
        })
    return alerts
```

Thresholds (`0.2`, `0.10`, `5`) are constants at the top of the wrapper file, not DB-driven — Sprint 2 keeps them hardcoded for simplicity; Sprint 3+ may move to a `clientes.gbp_alert_thresholds` table for per-cliente tuning.

---

## 5. Auth / RBAC Matrix

| Action | UI gate | Server gate | Notes |
|---|---|---|---|
| View benchmark section | `gbp.read` | n/a (display only) | Same as other GBP read sections |
| Trigger competitive analyze | (auto on Ficha Actual expand) | n/a (display only) | No mutation button; the fetch happens server-side via n8n |
| Direct webhook call to `crm-gbp-competitive-analyze` | n/a | n8n JWT `gbp.write` check | Same pattern as REQ-2 Sprint 1 |
| View alerts banner | `gbp.read` | `CRM_GBP_ALERTS_LIST` JWT `gbp.read` | Banner shows last N undismissed; read-only display |
| Dismiss alert | `gbp.write` | `CRM_GBP_ALERTS_DISMISS` JWT `gbp.write` | Dismiss button disabled with tooltip "Requires gbp.write" for read-only users |
| Cron dispatch | n/a (no UI) | n/a (cron trigger, no JWT) | Internal; reads unsent rows + sends SMTP |

**No new RBAC permissions.** Sprint 2 reuses Sprint 1's `gbp.read` / `gbp.write` mapping (admin gets all, supervisor gets read, operador gets nothing). S2C alert dismiss requires `gbp.write` — consistent with audit mutation gates.

The webhook gate ensures that even if the frontend exposes the endpoint, a user without `gbp.write` cannot trigger it via direct curl. The frontend itself never sends a mutation request for the benchmark — it's a read flow driven by expanding Ficha Actual. S2C alert dismiss IS a mutation (sets `dismissed_at`), so it requires `gbp.write` end-to-end.

---

## 6. Error Handling

| Layer | Failure | Behavior |
|---|---|---|
| Scraper 2A — all strategies fail for one field | `try/except` per strategy; warn to stderr | Field returns null/0 (Sprint 1 behavior preserved) |
| Scraper 2A — `audit_data` JSON structure changes due to new fields | Wrapper validates keys before INSERT | Defensive: missing keys default to null/0 |
| Wrapper 2B — Google CAPTCHA during search | Existing CAPTCHA handler in `gbp_ficha_audit.py` | Returns `{"error": "captcha"}`; workflow returns 503 |
| Wrapper 2B — cookie session expired | Cookie check at `init_browser()` | Returns 503 `{"error": "session_expired"}`; agency sees actionable error |
| Wrapper 2B — fewer than 3 competitors found | Filter + pad from #N+1 | Returns whatever found (could be 0, 1, 2, or 3) |
| n8n 2B — JWT missing | Code node returns 403 | UI displays error in benchmark section |
| n8n 2B — cliente has no `place_id` | Workflow queries `clientes` table; returns 400 | UI displays "Cliente sin place_id configurado" |
| n8n 2B — wrapper times out (>60s) | n8n node timeout | Returns 504; UI displays "Análisis competitivo excedió tiempo — reintentar" |
| Frontend — benchmark query error | `useN8nQuery` returns error state | Display "Sin competidores identificados" + retry button |
| DB 2B — ALTER CHECK constraint fails | Migration is idempotent + paired with wrapper restart | `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT`; rollback-safe |
| Wrapper 2C — `_compute_alerts()` raises (e.g. malformed `audit_data`) | try/except inside helper; stderr warning | Audit save still succeeds; alerts table remains empty for that row; next audit retry may trigger alerts if data normalizes |
| Wrapper 2C — INSERT to `clientes.gbp_alerts` fails (DB unreachable) | try/except; stderr warning | Audit save already committed; alert is lost (acceptable — agency sees alerts in UI from next manual audit). No retry queue in Sprint 2 |
| Dispatch 2C — SMTP 5xx | n8n workflow catches SMTP error; logs to stderr | Rows remain with `sent_at IS NULL`; next 5-min cron tick retries |
| Dispatch 2C — cron downtime | n8n VPS schedule auto-recovers on container restart | Backlog accumulates in `gbp_alerts`; drained on next tick |
| Dispatch 2C — `email_destinatario` is invalid format | Dispatch validates with regex before send; if invalid, falls back to global default + logs warning | Avoids silent failure; agency can fix DB column manually |
| Frontend 2C — `CRM_GBP_ALERTS_LIST` returns 403 (no `gbp.read`) | `useN8nQuery` returns error | `GbpAlerts` renders nothing (silent — no banner for unauthorized user) |
| Frontend 2C — `CRM_GBP_ALERTS_DISMISS` returns 403 (no `gbp.write`) | Button is disabled with tooltip before call | User sees tooltip; no mutation attempted |

---

## 7. Caching / Query Strategy

| Layer | Pattern | Used For |
|---|---|---|
| Wrapper `/run` (existing) | 24h read-through on `gbp_audit_history` | Per-place_id audit cache (Sprint 1) |
| Wrapper `/competitive-analyze` (NEW) | **No cache** — fresh every call | Agency pitch must show current leader |
| n8n `CRM_GBP_COMPETITIVE_ANALYZE` | Direct call to wrapper, no caching layer | Single source of freshness |
| Frontend `useN8nQuery` for benchmark | `staleTime: 0` (always refetch on mount); `gcTime: 5 min` | Cache for back-navigation only; refetch on tab open |
| Wrapper `_compute_alerts` (NEW S2C) | Inline synchronous call from `/run` after `save_history()` | Detection latency: <100ms added to `/run` |
| `clientes.gbp_alerts` table (NEW S2C) | Append-only + indexed `(cliente_id, created_at DESC) WHERE sent_at IS NULL AND dismissed_at IS NULL` | Frontend fetch + dispatch cron scan |
| n8n `CRM_GBP_ALERTS_DISPATCH` (NEW S2C) | Cron every 5 min; SELECT unsent rows grouped by cliente; SMTP send; UPDATE `sent_at` | Async delivery, decoupled from audit save |
| Frontend `useN8nQuery` for alerts (NEW S2C) | `staleTime: 30s`; `gcTime: 5 min`; refetch on tab focus | Alerts appear within 30s of dispatch (target <5min total) |

**Cookie wear estimate**: 1 competitive call = 1 search page + 3 ficha pages = 4 Google Maps requests. Agency uses this ~5-10x/day. Session cookies last ~2-4 weeks (Sprint 1 baseline). No immediate concern.

---

## 8. Dev / Prod Parity

- **Dev scraper state**: Local Python install requires Playwright + `google_session.json`. Sprint 2A changes only the extraction logic; no new dependencies.
- **Dev wrapper state**: `/competitive-analyze` and `/check-alerts` (internal) endpoints added to `gbp_http_wrapper.py`; locally runnable via `python3 gbp_http_wrapper.py` (already running on port 8095). `_compute_alerts()` helper is pure (no external deps).
- **n8n workflow**: `CRM_GBP_COMPETITIVE_ANALYZE` and S2C workflows (`CRM_GBP_ALERTS_LIST`, `CRM_GBP_ALERTS_DISMISS`, `CRM_GBP_ALERTS_DISPATCH`) are VPS-only (per Sprint 1 pattern); dev environment shows "Servicio no disponible" skeleton in `GbpBenchmark.jsx` and empty alert banner in `GbpAlerts.jsx` if webhooks 404.
- **DB migration**: ALTER CHECK constraint + new `clientes.gbp_alerts` table + `clientes.email_destinatario` column are VPS-only (postgres-vps tunnel :5433); `gbp_audit_history` already exists from Sprint 1.
- **SMTP**: dev cannot send real emails (no SMTP cred in local n8n). Dispatch cron is VPS-only; local wrapper logs computed alerts to stderr for manual verification.
- **No localhost fallback.** All webhook URLs use `VITE_N8N_URL` (`useN8n.js:15`).
- **No mock data.** `GbpBenchmark.jsx` and `GbpAlerts.jsx` empty states are UI strings, not fake fixtures.

---

## 9. Performance / Security / Operability

- **Performance**: 2A adds ~3-4 fallback attempts per field × ~50ms each = ~200ms overhead per audit. 2B adds 30-60s latency to first Ficha Actual expand. 2C adds ~5-50ms to `/run` (synchronous `_compute_alerts()` + zero-or-few INSERTs). Dispatch cron: ~1-2s per 100 unsent alerts. All acceptable for the agency workflow (manual trigger + 5-min dispatch tick).
- **Security**: Frontend never accesses PostgreSQL (rule preserved). n8n validates JWT. Wrapper `/competitive-analyze` and `/check-alerts` (internal) accept no auth (called only from n8n internal network). Wrapper continues to log scraper calls to stderr for forensics. SMTP cred is stored only in n8n — wrapper never sees the password.
- **Cookie wear**: 4× requests per competitive call. Mitigated by reusing the Playwright browser session (one login per ~2-4 weeks).
- **Operability**: Schema changes in 2B (CHECK constraint) + 2C (new table + new column) are all idempotent migrations paired with wrapper restart. Rollback per slice: `git revert HEAD` + reverse migration.
- **Observability**: Stderr warnings from Slice 2A selectors surface to `journalctl -u gbp-ficha.service`. Competitive call duration logged in `clientes.gbp_audit_history.scrape_duration_ms`. S2C alert writes logged to `clientes.gbp_alerts.created_at`; dispatch attempts logged via n8n workflow execution history (success/error).

---

## 10. Per-Slice Design Notes

> Each slice ≤400 LOC, commits ≤3 files (GGA discipline). Sprint 2 = 2 chained PRs.

### S2A — Scraper Selectors Fix (REQ-5)

| Aspect | Detail |
|---|---|
| Spec | `specs/clientes/spec.md` REQ-5 |
| Files | `/opt/fabrica/scripts/gbp_ficha_audit.py` (modify 4 extraction blocks; ~150 LOC delta including comments) |
| Workflows | none (scraper-only changes flow through existing wrapper) |
| New endpoints | none |
| Canary | Cliente 693 (AG FITNESS BURGOS) — verify `reviews_count ≥ 10`, `descripcion` non-null, `horarios_dias_cubiertos ≥ 6`, `atributos_seteados ≥ 8` |
| Tests | Manual: re-run audit on cliente 693, diff `audit_data` JSON against Google Maps reality. No new automated tests (scraper is full-stack; Sprint 1 discipline leaves UI tests, not Python tests) |
| Slice commit | 1 work-unit (1 file: `gbp_ficha_audit.py`) |
| Rollback | `git revert HEAD`; Sprint 1 zero/null behavior returns |
| **NOT in S2A** | Other scraper fields (rating, fotos, categorias) — Sprint 1 paths stay untouched |
| **Dependencies** | None (first slice) |

**Extraction block structure** (each of the 4 fields):

```python
def _extract_descripcion(page) -> tuple[str | None, str]:
    """Multi-fallback descripcion extraction. Returns (value, strategy_used)."""
    import re as _re
    # Strategy 1: ARIA region
    for sel in [
        "[aria-label*='Descripción' i]",
        "[role='region'][aria-label*='descrip' i]",
    ]:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=2000):
                text = el.inner_text(timeout=2000).strip()
                if text and len(text) > 50:
                    return _clean_descripcion(text), "aria"
        except Exception:
            continue

    # Strategy 2: CSS classes (Google rotates these)
    for sel in ["div.WeS02d", ".WeS02d", "[class*='descripcion']", "[class*='description']"]:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=2000):
                text = el.inner_text(timeout=2000).strip()
                if text and len(text) > 50:
                    return _clean_descripcion(text), "css"
        except Exception:
            continue

    # Strategy 3: body-text regex fallback
    try:
        body = page.locator("body").inner_text()
        paragraphs = [p.strip() for p in body.split("\n\n") if len(p.strip()) > 100]
        for p in paragraphs:
            if any(sp.lower() in p.lower() for sp in SKIP_PHRASES):
                continue
            if any(sp.lower() in p.lower() for sp in PRIVATE_TERMS):
                continue
            return _clean_descripcion(p)[:500], "regex"
    except Exception:
        pass

    sys.stderr.write("[gbp_scraper] descripcion: all_strategies_failed\n")
    return None, "none"
```

This pattern (tuple return for testability + strategy_used for stderr logging) is replicated for `extract_horarios`, `extract_atributos`, `extract_reviews_count`.

### S2B — Competitive Analysis Endpoint (REQ-6)

| Aspect | Detail |
|---|---|
| Spec | `specs/clientes/spec.md` REQ-6 |
| Files | `/opt/fabrica/scripts/gbp_http_wrapper.py` (add `/competitive-analyze` endpoint, ~80 LOC), `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpBenchmark.jsx` (new, ~140 LOC), `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpFichaActual.jsx` (modify to mount `<GbpBenchmark>`, ~10 LOC delta) |
| Workflows | NEW `CRM_GBP_COMPETITIVE_ANALYZE` (VPS only) — JWT gate + DB read for cliente's own cache + wrapper call + history INSERT |
| New endpoints | `POST /competitive-analyze` on wrapper (internal) |
| DB | `ALTER TABLE clientes.gbp_audit_history DROP/ADD CONSTRAINT` to include `'competitive-analyze'` |
| Canary | Cliente 693 → call workflow → expect 3 competitors with delta JSON |
| Tests | Manual: `n8n-mcp-vps execute` on the new workflow + UI check |
| Slice commit | 2 work-units: WU-a (wrapper endpoint + ALTER + workflow), WU-b (frontend `GbpBenchmark.jsx` + integration) |
| Rollback | WU-a: `git revert` wrapper + workflow deactivation + DROP CONSTRAINT; WU-b: `git revert` removes `GbpBenchmark.jsx` and import |
| **Dependencies** | S2A complete (competitive scraping uses fixed selectors) |

**Wrapper endpoint pseudocode**:

```python
@app.route("/competitive-analyze", methods=["POST"])
def competitive_analyze():
    body = request.get_json(force=True)
    categoria = body.get("categoria", "").strip()
    ciudad = body.get("ciudad", "").strip()
    top_n = int(body.get("top_n", 3))
    exclude_place_id = body.get("exclude_place_id")

    if not categoria or not ciudad:
        return {"error": "missing_required_fields"}, 400

    init_browser()  # idempotent; reuses session
    page = browser.new_page()
    try:
        # 1. Search
        search_url = f"https://www.google.com/maps/search/{quote(categoria)}+{quote(ciudad)}"
        page.goto(search_url, wait_until="domcontentloaded", timeout=20_000)
        page.wait_for_timeout(3000)

        # 2. Extract top-N place_ids from results
        candidate_ids = _extract_search_results(page)[:top_n + 2]  # grab a few extra for filtering

        # 3. Filter self
        competitors = []
        for pid in candidate_ids:
            if pid == exclude_place_id:
                continue
            audit = scrape_full_audit(page, pid)
            competitors.append(_normalize_competitor(audit))
            if len(competitors) >= top_n:
                break

        return {"competitors": competitors, "total_duration_ms": int((time.time() - start) * 1000)}
    finally:
        page.close()
```

**Frontend component sketch**:

```jsx
const GbpBenchmark = ({ cliente }) => {
  const { data, isLoading, error } = useN8nQuery(
    ['gbp-benchmark', cliente.id, cliente.categoria, cliente.ciudad],
    'crm-gbp-competitive-analyze',
    { params: { cliente_id: cliente.id, categoria: cliente.categoria, ciudad: cliente.ciudad },
      staleTime: 0 }
  );

  if (isLoading) return <Skeleton />;  // ≤5 LOC
  if (error || !data?.competitors) return <EmptyState categoria={...} ciudad={...} />;

  return <BenchmarkTable cliente={data.cliente} competitors={data.competitors} delta={data.delta_vs_leader} />;
};
```

### S2C — Regression Alerts via Email (REQ-7)

| Aspect | Detail |
|---|---|
| Spec | `specs/clientes/spec.md` REQ-7 |
| Files | `/opt/fabrica/scripts/gbp_http_wrapper.py` (extract `_compute_alerts()` helper + invoke from `/run` post-save, ~50 LOC delta), `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpAlerts.jsx` (new, ≤150 LOC), `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpHeader.jsx` (mount `<GbpAlerts>`, ~5 LOC delta) |
| Workflows | NEW `CRM_GBP_ALERTS_DISPATCH` (VPS, cron every 5 min) + `CRM_GBP_ALERTS_LIST` (GET, JWT `gbp.read`) + `CRM_GBP_ALERTS_DISMISS` (POST, JWT `gbp.write`) |
| New endpoints | Internal wrapper helper (called inline from `/run`); no new HTTP endpoint exposed externally |
| DB | NEW `clientes.gbp_alerts` table + NEW `clientes.email_destinatario TEXT` column (idempotent migrations) |
| SMTP | Existing `informacion@ia-bybusiness.com` cred (n8n cred ID `8NbamWrMdRexLNwa`); per-cliente override via `email_destinatario`; global default `rafaeldelinares@gmail.com` via `GBP_ALERT_DEFAULT_EMAIL` env var in n8n credential |
| Canary | Cliente 693 → manually inject `audit_data` with `rating=4.5` (delta −0.3 from prior 4.8) → verify `clientes.gbp_alerts` row with `alert_type='rating_drop'` → verify cron dispatch marks `sent_at` within 5-10 min |
| Tests | Manual: simulate rating drop via SQL UPDATE on `gbp_audit_history.audit_data` + trigger `/run`; verify alert row + cron dispatch; verify UI banner renders with dismiss button |
| Slice commit | 1 work-unit (backend helper + DB migration + 3 n8n workflows + frontend component); can split into WU-a (backend + DB + cron) and WU-b (frontend) if needed for review |
| Rollback | `git revert HEAD` removes helper + cron + frontend; `DROP TABLE clientes.gbp_alerts` + `ALTER TABLE clientes DROP COLUMN email_destinatario` (paired rollback migration); deactivate 3 n8n workflows |
| **NOT in S2C** | Competitor alerts (Sprint 3+); Slack/SMS/push channels (Sprint 3+); per-cliente thresholds (Sprint 3+); multi-recipient routing (Sprint 3+) |
| **Dependencies** | S2A complete (alert computation needs realistic `audit_data` from fixed selectors); S2B independent (alerts use self-audit data, not competitor data) |

**`_compute_alerts()` extraction** (DRY with `_drift_response()`):

The existing `_drift_response()` (Sprint 1) computes deltas for the `/drift` endpoint. The new `_compute_alerts(prev, curr)` is a pure function (no DB access) that returns a `list[Alert]` triggered by the deltas. It reuses the same drift math (`safe_int`, `round`) but emits Alert dicts instead of HTTP response. Single source of truth for delta logic.

**Frontend component sketch**:

```jsx
const GbpAlerts = ({ cliente, canDismiss }) => {
  const { data } = useN8nQuery(
    ['gbp-alerts-list', cliente.id],
    'crm-gbp-alerts-list',
    { params: { cliente_id: cliente.id }, staleTime: 30_000 }
  );
  const dismissMutation = useN8nMutation('crm-gbp-alerts-dismiss', { gbp_write: true });

  if (!data?.alerts?.length) return null;
  return (
    <div className="flex flex-col gap-2 mb-4">
      {data.alerts.map(a => (
        <AlertBanner key={a.alert_id} alert={a} onDismiss={
          canDismiss ? () => dismissMutation.mutate({ alert_id: a.alert_id, cliente_id: cliente.id }) : null
        } />
      ))}
    </div>
  );
};
```

---

## 11. File Inventory (Sprint 2 cumulative)

| Status | Path | Purpose |
|---|---|---|
| MODIFY | `/opt/fabrica/scripts/gbp_ficha_audit.py` | 4 extraction blocks rewritten with multi-fallback |
| MODIFY | `/opt/fabrica/scripts/gbp_http_wrapper.py` | New `/competitive-analyze` endpoint (2B) + extract `_compute_alerts()` + invoke from `/run` post-save (2C) |
| NEW | `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpBenchmark.jsx` | Benchmark display sub-component |
| MODIFY | `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpFichaActual.jsx` | Mount `<GbpBenchmark>` below existing sections |
| NEW | `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpAlerts.jsx` | Alert banner sub-component (S2C) |
| MODIFY | `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpHeader.jsx` | Mount `<GbpAlerts>` below score pill (S2C, ~5 LOC delta) |
| NEW (n8n) | `CRM_GBP_COMPETITIVE_ANALYZE` | POST webhook with JWT gate (S2B) |
| NEW (n8n) | `CRM_GBP_ALERTS_DISPATCH` | Cron every 5 min, SMTP send (S2C) |
| NEW (n8n) | `CRM_GBP_ALERTS_LIST` | GET webhook, JWT `gbp.read` (S2C) |
| NEW (n8n) | `CRM_GBP_ALERTS_DISMISS` | POST webhook, JWT `gbp.write` (S2C) |
| DB | `ALTER TABLE clientes.gbp_audit_history` constraint update (add `'competitive-analyze'`) (S2B) |
| DB | `CREATE TABLE clientes.gbp_alerts` (S2C) |
| DB | `ALTER TABLE clientes.clientes ADD COLUMN email_destinatario TEXT` (S2C) |

LOC budgets per slice: **S2A ~150 LOC**, **S2B ~250 LOC**, **S2C ~200 LOC** — well under 400-LOC ceiling. Sprint 2 cumulative ~600 LOC.

---

## 12. Risks & Mitigations

| Risk | Likelihood | Mitigation | Owner Slice |
|------|------------|-----------|------------|
| **R1** Google Maps rotates CSS classes again within weeks of 2A deploy | Med | Multi-fallback strategy: ARIA roles + regex survive CSS rotation. Stderr warnings surface failures within hours. | S2A |
| **R2** Competitive scraping triggers CAPTCHA (4× page loads per call) | High | Reuse existing `init_browser()` session (one login per 2-4 weeks). 60s timeout. CAPTCHA response returns 503 gracefully. | S2B |
| **R3** Cliente's own ficha appears in top-3 search results | Med | Wrapper filters `exclude_place_id`; pads with #N+1 if available. | S2B |
| **R4** Wrong `categoria` produces poor competitor match | Low | UI passes cliente's stored `categoria`; agency can override per call. Sprint 3+ may add categoria suggestions. | S2B |
| **R5** Slice 2B exceeds 400 LOC budget | Low | Strategy: keep `GbpBenchmark.jsx` ≤150 LOC; n8n workflow thin (≤20 nodes); wrapper endpoint ≤100 LOC. | S2B |
| **R6** Scraper fix changes `audit_data` enough to break `gaps.js` thresholds | Med | After first production audit post-S2A, review `gaps.js` thresholds: if `reviews_count > 0`, existing `qa_sin_responder` rule may fire differently. Adjust if needed. | S2A |
| **R7** ALTER CHECK constraint fails because table doesn't exist | Low | Constraint already extended in Sprint 1 to include `'scheduled'`; `'competitive-analyze'` adds cleanly. `IF EXISTS` pattern used. | S2B |
| **R8** n8n JWT validation requires JWT issuance infrastructure | Low | Sprint 1 verified JWT infra works (REQ-2 server gate); S2B reuses same pattern. | S2B |
| **R9** Frontend `GbpBenchmark.jsx` triggers excessive fetches | Med | `useN8nQuery` with `staleTime: 0` + `gcTime: 5 min`; cached for back-nav but refetches on tab open. | S2B |
| **R10** Wrapper restart disrupts existing audit flow | Low | systemd manages `gbp-ficha.service` with auto-restart on failure; deploy window with low traffic. | S2B |
| **R11** SMTP failure (5xx from `informacion@ia-bybusiness.com`) prevents email delivery | Med | Alerts persist in `clientes.gbp_alerts` with `sent_at IS NULL`; cron retries every 5 min; UI shows alerts even if email fails (decoupled design). Wrapper restart, n8n cron, and DB are independent failure domains. | S2C |
| **R12** False positive: minor rating fluctuation triggers 0.2 threshold | Low | Hysteresis: only fires when ABSOLUTE drop ≥0.2 (not fractional drift); photos threshold is 10% relative; canary test covers stable scenarios. Tests: scenario REQ-7.6 covers stable audit with delta < 0.1 → no alert. | S2C |
| **R13** Email rate limiting if many alerts accumulate for same cliente in 1 day | Low | Dispatch cron groups all unsent alerts per `cliente_id` into ONE digest email per tick (not one email per alert). Sprint 3+ may add per-type throttling. | S2C |
| **R14** Wrapper restart during `_compute_and_save_alerts()` step | Low | Step is idempotent — recomputation reads same prev/curr rows from `gbp_audit_history`; no duplicate alerts (enforced by `UNIQUE (place_id, prev_audit_id, alert_type)` constraint). | S2C |
| **R15** Dispatch cron downtime (n8n container down) | Low | Backlog accumulates in `clientes.gbp_alerts` with `sent_at IS NULL`; cron auto-recovers on container restart; backlog drained on next tick. No data loss. | S2C |
| **R16** `email_destinatario` set to invalid email format | Low | Dispatch validates with regex before SMTP send; if invalid, falls back to global default + logs stderr warning. Avoids silent SMTP failures. | S2C |

---

## 13. Open Questions

- **OQ-1**: When fewer than 3 unique competitors exist after exclusion, what should the response look like? Spec REQ-6 Scenario "Sparse category+city" answers this: return whatever found, no fabrication. Resolved.
- **OQ-2**: Should `GbpBenchmark` show on the unified GBP tab for ALL users with `gbp.read`, or only when categoria+ciudad are present in cliente data? Default: render section header always, show graceful empty state if data missing. Resolved.
- **OQ-3**: Cookie session wear — at what daily call rate should we add caching? Tracked as Sprint 3 backlog; not blocking Sprint 2.
- **OQ-4** (S2C): Post-audit hook vs scheduled cron for alert computation? **Resolved: post-audit hook in wrapper** (AD-15). Justification: detection is synchronous with audit save (same `/run` flow), drift logic already exists in `_drift_response()` (extract to `_compute_alerts()`), zero new infrastructure. Cron would add 24h detection latency.
- **OQ-5** (S2C): Synchronous email send vs async dispatch? **Resolved: async dispatch via n8n cron** (AD-16). Justification: SMTP failure must not block audit save; decoupled design lets alerts queue in DB and retry every 5 min. Wrapper stays HTTP-only (no SMTP library added).
- **OQ-6** (S2C): Where to store per-cliente email destination? **Resolved: `clientes.email_destinatario TEXT` column** (AD-17). Justification: per-cliente override without code change; nullable → fallback to global default. Idempotent ALTER TABLE.
- **OQ-7** (S2C): Per-alert email vs digest email? **Resolved: digest email** (AD-19). Justification: avoids alert spam if multiple regressions hit at once. Trade-off: partial dispatch possible if SMTP fails mid-tick — acceptable given 5-min retry interval.
- **OQ-8** (S2C): Where to mount `GbpAlerts` in the unified GBP tab? **Resolved: under `GbpHeader`** (AD-20). Justification: alerts are time-sensitive UX; they must be the first thing the user sees. ~5 LOC mount delta.

---

## 14. Migration / Rollout

| Phase | Action | Reversible? |
|---|---|---|
| S2A deploy | `gbp_ficha_audit.py` rewrite + wrapper restart (Playwright picks up new code on next call) | Yes — `git revert HEAD` reverts the file |
| S2B deploy (WU-a) | Wrapper `/competitive-analyze` + ALTER CONSTRAINT + n8n workflow create | Yes — `git revert` wrapper, `DROP CONSTRAINT`, deactivate workflow |
| S2B deploy (WU-b) | `GbpBenchmark.jsx` + `GbpFichaActual.jsx` integration | Yes — `git revert` removes files |
| S2C deploy (WU-a) | `_compute_alerts()` helper + `/run` post-save hook + `CREATE TABLE clientes.gbp_alerts` + `ALTER TABLE clientes ADD COLUMN email_destinatario` + 3 n8n workflows (`CRM_GBP_ALERTS_DISPATCH`, `LIST`, `DISMISS`) | Yes — `git revert HEAD` removes helper + workflows; `DROP TABLE clientes.gbp_alerts` + `ALTER TABLE clientes DROP COLUMN email_destinatario` (paired rollback); deactivate 3 n8n workflows |
| S2C deploy (WU-b) | `GbpAlerts.jsx` + `GbpHeader.jsx` integration | Yes — `git revert` removes files |

Each slice independently shippable. S2A ships first as a quick win; S2B depends on S2A (competitive scraping uses fixed selectors); S2C depends on S2A (alert computation needs realistic `audit_data` from fixed selectors) but is independent of S2B.

**Prerequisite check before S2A apply**: confirm VPS Playwright session is alive (`journalctl -u gbp-ficha.service | tail -5`).

**Prerequisite check before S2B apply**: confirm ALTER CONSTRAINT succeeds (idempotent); confirm n8n JWT infra working (Sprint 1 REQ-2 already validated this).

**Prerequisite check before S2C apply**: confirm SMTP credential `8NbamWrMdRexLNwa` exists in n8n VPS and test-send works; confirm `GBP_ALERT_DEFAULT_EMAIL` env var is set to `rafaeldelinares@gmail.com` in n8n credential; confirm idempotent migration runs cleanly (`CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`).

---

## 15. Testing Strategy

| Layer | What | How |
|---|---|---|
| Manual (S2A) | Cliente 693 canary: re-run audit, diff against Google Maps reality | `ssh` VPS → run wrapper → compare JSON |
| Manual (S2A) | `journalctl -u gbp-ficha.service` shows NO stderr warnings for the 4 fixed fields | Per deploy |
| Manual (S2A) | Existing audits for 5 other clientes: no regression on rating/fotos/categorias | Spot check |
| Manual (S2B) | `n8n-mcp-vps execute` on `CRM_GBP_COMPETITIVE_ANALYZE` with cliente 693 payload | Per workflow |
| Manual (S2B) | UI: open GBP tab for cliente 693 → benchmark table renders 3 competitors with deltas | Browser check |
| Manual (S2B) | Server-side: curl webhook WITHOUT `gbp.write` token → expect 403 | `curl` test |
| Manual (S2B) | Server-side: webhook with cliente that has no `place_id` → expect 400 | DB fixture |
| Manual (S2B) | Empty competitive case: cliente with no other gyms in city → render empty state | DB fixture |
| Manual (S2C) | Inject rating drop 0.3 in `gbp_audit_history` for cliente 693, run `/run`, verify `gbp_alerts` row | SQL + curl |
| Manual (S2C) | Verify cron dispatch marks `sent_at IS NOT NULL` within 5-10 min of INSERT | SQL `SELECT` after cron tick |
| Manual (S2C) | Verify email lands in `rafaeldelinares@gmail.com` (check inbox) | Manual |
| Manual (S2C) | SMTP failure: temporarily disable SMTP cred → verify alert row stays with `sent_at IS NULL` → re-enable → verify cron retries within 5 min | n8n UI + SQL |
| Manual (S2C) | Per-cliente override: `UPDATE clientes SET email_destinatario='test@example.com' WHERE id=693` → trigger alert → verify email routes to `test@example.com` | SQL + manual |
| Manual (S2C) | No false positives: stable audit (delta < threshold) → no `gbp_alerts` row written | SQL `COUNT(*)` over 7 days |
| Manual (S2C) | Frontend: open GBP tab for cliente 693 with 3 undismissed alerts → verify 3 banner rows + dismiss button → click dismiss → verify `dismissed_at IS NOT NULL` | Browser + SQL |
| Manual (S2C) | RBAC: user with only `gbp.read` → verify banner renders but dismiss button is disabled with tooltip | Browser |

**No new test infrastructure required.** Sprint 1 established the manual-test discipline; Sprint 2 inherits.

---

## 16. Hard Constraints (self-check)

- [x] Components ≤150 LOC: `GbpBenchmark.jsx` budgeted at ~140 LOC; `GbpAlerts.jsx` budgeted at ~120 LOC; `GbpFichaActual.jsx` stays ~150 with integration delta; `GbpHeader.jsx` mount delta ~5 LOC.
- [x] No inline styles (CSS custom-property exception noted in `AGENTS.md` allowed for runtime-proportional widths; not needed in Sprint 2).
- [x] No new RBAC permissions (reuses Sprint 1 `gbp.read` / `gbp.write`; S2C dismiss requires `gbp.write`, list requires `gbp.read`).
- [x] Frontend never hits PostgreSQL (rule in `openspec/config.yaml` `rules.design`).
- [x] No localhost fallback.
- [x] No mock data. Empty states are UI strings.
- [x] Each slice ≤400 changed lines (S2A ~150, S2B ~250, S2C ~200).
- [x] Sprint 2 scope only — Sprint 3+ (daily digest, multi-recipient routing, per-cliente thresholds, competitor alerts, Slack/SMS) goes to "Out of Scope".
- [x] No external services, no paid APIs, no Google Business Profile API.
- [x] S2C idempotent migrations: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`.
- [x] S2C detection idempotency: `UNIQUE (place_id, prev_audit_id, alert_type)` constraint.
- [x] S2C dispatch resilience: rows persist with `sent_at IS NULL` on SMTP failure; cron retries every 5 min.

---

## 17. Out of Scope (Sprint 3+)

- Historical competitor tracking with diff over time
- Scheduled cron-driven competitive audits (`audit_source = 'competitive-scheduled'`)
- Caching competitive results with TTL (Sprint 2 always fresh)
- Multi-region competitor comparison (single ciudad only)
- Auto-discovering cliente's `categoria` and `ciudad` from place_id (caller provides in Sprint 2)
- Qwen-generated natural language summary of competitive gaps
- Scoring competitors by relevance (distance, recency, reviews quality)
- Filtering out chains/franchises vs local businesses
- Google Business Profile API (paid) integration
- Per-cliente customization of which competitors count (today: any top-3 by Google ranking)
- Reverse-engineering leader's `categoria` strategy or posting cadence
- **S2C** Email/Slack alerts when COMPETITOR crosses threshold (S2C handles SELF audit regressions only)
- **S2C** Slack / SMS / push notification channels (S2C is email-only)
- **S2C** Daily-digest mode for self-audit alerts (S2C sends one email per alert cluster per dispatch tick)
- **S2C** Multi-recipient email routing per cliente (one email destination per cliente in S2C)
- **S2C** Per-cliente threshold tuning (S2C thresholds are global; per-cliente overrides deferred to Sprint 3+)
- **S2C** Auto-reply to negative reviews from within the alert workflow (alert-only, no action)
- **S2C** Alert subscriptions (users opt in/out of specific alert types per cliente)