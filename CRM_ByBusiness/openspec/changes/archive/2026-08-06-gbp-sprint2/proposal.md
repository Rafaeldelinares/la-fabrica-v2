# Proposal: GBP Ficha Improvements — Sprint 2

## Context

Sprint 1 (`gbp-ficha-improvements`, archived 2026-08-06) shipped the unified GBP tab, RBAC gates, append-only history, and deterministic gap analysis. The feature is **verified working end-to-end** for cliente 693 (AG FITNESS BURGOS): HEADER shows 15% score, FICHA ACTUAL renders Categoría + Rating + Fotos, CHECKLIST shows 15 photos marked ✓, RECOMENDACIONES lists 5 prioritized gaps.

However, Sprint 1 verified a known **scraper limitation** that is now blocking data quality:

| Field | Current (broken) | Google Maps reality |
|---|---|---|
| `reviews_count` | `0` | 12 (for AG FITNESS) |
| `descripcion` | `null` | full text present |
| `horarios_dias_cubiertos` | `2` | 7 days |
| `atributos_seteados` | `1 / 15` | `12 / 15` |

Root cause: `gbp_ficha_audit.py` (881 LOC) uses CSS selectors from an older Google Maps DOM (`.WeS02d`, `table.eK4R0e`, `[class*='review']`) that no longer match the 2026 Google Maps layout. The selectors silently fail inside `try/except Exception: pass` blocks, returning zero/null instead of raising.

Sprint 2 has three slices:
- **Slice 2A** — Fix the four broken selectors (quick win, unblocks realistic audit data)
- **Slice 2B** — Competitive analysis against top-3 GBP fichas in same categoría+ciudad (Tier-1 agency value, justifies service pricing)
- **Slice 2C** — Alertas de regresión con email: detect significant changes between consecutive audits and notify via email (NEW — appended after S2B)

## Scope

### Slice 2A — Scraper Selectors Fix (Quick Win)
- Replace broken CSS selectors in `gbp_ficha_audit.py` with robust Playwright locators that handle Google Maps' 2026 DOM changes
- Cover `descripcion`, `horarios` (7 days), `atributos` (counted), `reviews_count`
- Verify against cliente 693 (canary): wrapper returns realistic values matching Google Maps
- No new DB tables, no new workflows, no new frontend files
- **Target**: ~300 LOC; touches only `gbp_ficha_audit.py` + `gaps.js` if thresholds need adjustment

### Slice 2B — Análisis Competitivo (New Capability)
- New webhook `crm-gbp-competitive-analyze` (POST) accepting `{ cliente_id, categoria, ciudad }`
- Backend workflow: search Google Maps for top businesses matching categoría+ciudad → scrape top-3 fichas → return comparison JSON
- Comparison payload: per-competitor `{fotos_count, reviews_count, rating, horarios_dias_cubiertos, posts_count}` + delta vs cliente
- Frontend: new sub-component `GbpBenchmark.jsx` (≤150 LOC) rendered under `GbpFichaActual`
- New n8n workflow `CRM_GBP_COMPETITIVE_ANALYZE`
- **Target**: ~400 LOC; new wrapper endpoint, new n8n workflow, 1 new frontend sub-component + integration

### Slice 2C — Alertas de regresión con email (New Capability)
- Detect significant changes between consecutive audits and notify via email
- **Alert types** (4): rating drop ≥0.2 pts, photos count drop ≥10%, reviews count drop ≥5 OR new negative review >24h without owner response, description becomes empty after being filled
- **Email destination**: global default `rafaeldelinares@gmail.com`; per-cliente override via new `clientes.email_destinatario TEXT` column (nullable)
- **SMTP**: existing La Fábrica (`informacion@ia-bybusiness.com` via n8n SMTP cred ID `8NbamWrMdRexLNwa`, per `AGENTS.md`)
- **Trigger model**: post-audit hook in wrapper (`/run` → after `save_history()` calls `_compute_and_save_alerts()`); email **dispatch is async** via new n8n cron `CRM_GBP_ALERTS_DISPATCH` every 5 min — decouples detection (synchronous) from delivery (resilient, retryable)
- **Storage**: new table `clientes.gbp_alerts` (append-only alert log); migration is idempotent
- **New endpoints**: `POST /check-alerts` on wrapper (internal), `CRM_GBP_ALERTS_LIST` GET, `CRM_GBP_ALERTS_DISMISS` POST (n8n webhooks)
- **Frontend**: new `GbpAlerts.jsx` (≤150 LOC) mounted under `GbpHeader` showing last N alerts with dismiss
- **Target**: ~200 LOC; 1 work-unit (backend helper + DB migration + cron workflow + frontend component, all under 400 LOC ceiling)

## Out of Scope

- Google Business Profile API (paid) integration
- External AI services or paid APIs (must use local Playwright + Qwen only)
- Multi-tenant benchmarking or historical competitor tracking
- Scheduled/recurring competitive audits (Sprint 3+)
- Email/Slack alerts when COMPETITOR crosses threshold (Sprint 3+ — S2C handles SELF audit regressions only)
- Daily-digest mode for self-audit alerts (Sprint 3+; S2C sends one email per alert cluster immediately)
- Slack / SMS / push notification channels (Sprint 3+; S2C is email-only)
- Reverse-search to discover a cliente's own `categoria`+`ciudad` (caller provides both)
- PDF reports from competitive analysis
- Caching competitive results — every call is fresh (rate-limited by Google cookie wear)

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `gbp-ficha-audit`: Sprint 1 capability. Sprint 2 adds REQ-5 (scraper selector robustness), REQ-6 (competitive analysis endpoint), and REQ-7 (regression alerts via email).

## Approach

### Slice 2A — Scraper Fix
Treat each broken field as an independent extraction with **at least 2 fallback locators**. Use ARIA roles + semantic queries (`[role='tab']`, `[aria-label*='horario']`) before relying on CSS classes that Google rotates monthly. Add visible-text probes as last-resort regex fallbacks. Keep all existing `try/except` wrappers — silent zero is acceptable when Google is truly missing data; the fix is to make selectors match when data IS present.

Locate each field with `page.locator(...).first` and verify `.is_visible(timeout=3000)` before reading. If a regex fallback path returns a positive count (e.g. 12 reviews parsed from body text), trust it over the empty CSS-class result.

### Slice 2B — Competitive Analysis
New wrapper endpoint `/competitive-analyze` orchestrates: (1) `search_businesses(category, city) -> [place_ids]` via Google Maps search URL `?q={category}+{city}` + result list scraping; (2) for each top-3 place_id, call existing `scrape_full_audit()` (now fixed in 2A); (3) return normalized comparison JSON. New n8n workflow `CRM_GBP_COMPETITIVE_ANALYZE` accepts `{ cliente_id, categoria, ciudad }`, looks up cliente's current `audit_data` for delta computation, calls wrapper, returns unified response.

Frontend: new `GbpBenchmark.jsx` (~140 LOC) consumes `useN8nQuery(['gbp-benchmark', clienteId, categoria, ciudad])`; renders a 4-column table (métrica | cliente | top-1 | top-2 | top-3 | delta vs líder).

### Slice 2C — Regression Alerts
Extract the existing drift logic from `gbp_http_wrapper.py._drift_response()` into a reusable `_compute_alerts(prev_data, curr_data) -> list[Alert]` helper. Hook into the existing `/run` flow: after `save_history()` returns, fetch `get_recent_history(place_id)` to get the previous row, call `_compute_and_save_alerts()`, and INSERT any triggered alerts into `clientes.gbp_alerts` with `sent_at IS NULL`. SMTP is decoupled — new n8n cron `CRM_GBP_ALERTS_DISPATCH` (every 5 min) reads unsent alerts, groups by `cliente_id`, sends ONE digest email per cliente via the existing SMTP cred (`informacion@ia-bybusiness.com`), and marks `sent_at`. Frontend `GbpAlerts.jsx` fetches via `CRM_GBP_ALERTS_LIST` (GET, JWT `gbp.read`) and exposes dismiss via `CRM_GBP_ALERTS_DISMISS` (POST, JWT `gbp.write`).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `/opt/fabrica/scripts/gbp_ficha_audit.py` | Modified | Replace 4 broken selectors with multi-fallback extraction |
| `/opt/fabrica/scripts/gbp_http_wrapper.py` | Modified | Add `/competitive-analyze` endpoint (~80 LOC) |
| `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpBenchmark.jsx` | New | Sub-component ≤150 LOC for benchmark display |
| `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpFichaActual.jsx` | Modified | Mount `<GbpBenchmark>` below existing sections |
| n8n VPS `CRM_GBP_COMPETITIVE_ANALYZE` | New | POST workflow, JWT `gbp.write` gated |
| `pure/gaps.js` (frontend) | Possibly modified | Thresholds may need tuning if `reviews_count` now > 0 |
| `/opt/fabrica/scripts/gbp_http_wrapper.py` | Modified (S2C) | Extract `_compute_alerts()` helper + new `POST /check-alerts` endpoint (~50 LOC delta) |
| n8n VPS `CRM_GBP_ALERTS_DISPATCH` (cron 5min) | New (S2C) | Reads unsent `clientes.gbp_alerts` rows; sends SMTP email; marks `sent_at` |
| n8n VPS `CRM_GBP_ALERTS_LIST` + `CRM_GBP_ALERTS_DISMISS` | New (S2C) | GET list / POST dismiss for frontend (`gbp.read` / `gbp.write`) |
| `clientes.gbp_alerts` (DB) | New (S2C) | Append-only: `id`, `cliente_id`, `place_id`, `alert_type`, `severity`, `delta_json`, `sent_at`, `dismissed_at`, `created_at` |
| `clientes.email_destinatario TEXT` (DB) | New (S2C) | Per-cliente email override (nullable, `ALTER TABLE`) |
| `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpAlerts.jsx` | New (S2C) | Banner sub-component ≤150 LOC; shows last N alerts with dismiss |
| `/opt/fabrica/CRM_ByBusiness/src/modules/admin/cartera/tabs/gbp/GbpHeader.jsx` | Modified (S2C) | Mount `<GbpAlerts>` below score pill (~5 LOC delta) |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Google Maps rotates CSS classes again within weeks of deploy | Med | Selector strategy uses ARIA roles + text patterns first; CSS last. Logged in stderr for fast diagnosis |
| Competitive scraping triggers Google CAPTCHA (4× more page loads per call) | High | Use existing cookie session (`google_session.json`); share Playwright instance across 3 fichas; cap `top_n=3` |
| Top-3 selection includes the cliente's own ficha | Med | Filter: if `place_id == cliente.place_id`, drop and pick #4 |
| Wrong `categoria` produces poor competitors (e.g. "Entrenador personal" matches cross-city franchises) | Low | UI passes cliente's `categoria` directly; agency can override per analysis |
| Slice 2B exceeds 400 LOC budget | Low | All server-side scraping logic stays in wrapper; n8n stays thin (≤20 nodes); `GbpBenchmark.jsx` ≤150 LOC |
| Scraper fix changes `audit_data` enough to break `gaps.js` thresholds | Med | If `reviews_count > 0`, existing `qa_sin_responder` rule may fire differently — review thresholds in `gaps.js` after first production audit |
| **S2C** SMTP failure (5xx from `informacion@ia-bybusiness.com`) prevents email delivery | Med | Alerts persist in `clientes.gbp_alerts` with `sent_at IS NULL`; cron retries every 5 min; UI shows alerts even if email fails (decoupled design) |
| **S2C** False positive: minor rating fluctuation triggers 0.2 threshold | Low | Hysteresis: only fires when ABSOLUTE drop ≥0.2 (not fractional drift); photos threshold is 10% relative; canary test covers stable scenarios |
| **S2C** Email rate limiting if many alerts accumulate for same cliente in 1 day | Low | Dispatch cron groups alerts per cliente into ONE digest email; Sprint 3+ adds per-type throttling |
| **S2C** Wrapper restart during `_compute_and_save_alerts()` step | Low | Step is idempotent — recomputation reads same prev/curr rows from `gbp_audit_history`; no duplicate alerts (PK on `(place_id, prev_audit_id, alert_type)`) |

## Rollback Plan

- **Slice 2A**: `git revert HEAD` reverts `gbp_ficha_audit.py` to Sprint 1 state. Audits return zeros again — feature still works, just with empty fields. No DB impact (cache schema unchanged).
- **Slice 2B**: `git revert HEAD` removes `GbpBenchmark.jsx` and `ClienteDrawer.jsx` import. New n8n workflow `CRM_GBP_COMPETITIVE_ANALYZE` deactivated (does not delete — easy re-enable). No DB impact.
- **Slice 2C**: `git revert HEAD` removes `GbpAlerts.jsx`, the `_compute_alerts()` helper, and the `POST /check-alerts` endpoint. New n8n workflows `CRM_GBP_ALERTS_DISPATCH` / `CRM_GBP_ALERTS_LIST` / `CRM_GBP_ALERTS_DISMISS` deactivated (not deleted — easy re-enable). DB: `DROP TABLE clientes.gbp_alerts` and `ALTER TABLE clientes DROP COLUMN email_destinatario` (rollback migration, paired with revert). No data loss risk because both objects are net-new.

## Dependencies

- `/opt/fabrica/scripts/gbp_ficha_audit.py` (target file, 881 LOC)
- `/opt/fabrica/scripts/gbp_http_wrapper.py` (~370 LOC after Sprint 1)
- `clientes.gbp_audit_cache` (UPSERT) and `clientes.gbp_audit_history` (append-only) — read for delta
- VPS n8n: `kyWibKXBuBknk2QX` (audit), `HCxYTf8KJvxXzg3N` (fichas), `3XtdVk9T3WXADqb1` (drift), `zewVyngklJkTkXgS` (extract URL)
- Existing `clientes` table (queried for cliente's `categoria` and `ciudad` if not provided in payload)
- Existing `useN8nQuery` + `useN8nMutation` hooks
- **S2C NEW**: n8n SMTP cred ID `8NbamWrMdRexLNwa` (`informacion@ia-bybusiness.com`) — already exists in n8n VPS per AGENTS.md
- **S2C NEW**: n8n schedule trigger for `CRM_GBP_ALERTS_DISPATCH` cron (every 5 min)
- **S2C NEW**: `clientes.gbp_alerts` table (S2C migration creates it, idempotent)
- **S2C NEW**: `clientes.email_destinatario TEXT` column (`ALTER TABLE ADD COLUMN IF NOT EXISTS`, nullable)

## Success Criteria

- [ ] Cliente 693 (AG FITNESS) audit returns `reviews_count ≥ 10`, `descripcion` non-null, `horarios_dias_cubiertos ≥ 6`, `atributos_seteados ≥ 8`
- [ ] Sprint 1 dashboard shows non-zero Reviews pill ✓, Descripción present, Horarios at full coverage
- [ ] New POST `crm-gbp-competitive-analyze` returns valid comparison JSON for cliente 693 within 30s
- [ ] `GbpBenchmark.jsx` ≤150 LOC; renders comparison table with métrica/cliente/top-3/delta columns
- [ ] Build clean (`npm run build`), no console errors, no console.log
- [ ] Chained PR strategy honored (Sprint 1 convention)
- [ ] **S2C** Cliente 693 audit with manual rating drop of 0.3 → `clientes.gbp_alerts` row with `alert_type='rating_drop'`, `sent_at IS NOT NULL` within 10 min
- [ ] **S2C** `GbpAlerts.jsx` ≤150 LOC; renders dismissable banner with type icon, delta value, timestamp
- [ ] **S2C** SMTP failure scenario: alert row persists with `sent_at IS NULL`; next 5-min cron retry sends within 5 min of SMTP recovery
- [ ] **S2C** Per-cliente email override: setting `clientes.email_destinatario='test@example.com'` for cliente 693 routes their alerts there (others go to global default)
- [ ] **S2C** No false positives: cliente 693 audit with stable rating (delta < 0.1) → no `rating_drop` alert row written