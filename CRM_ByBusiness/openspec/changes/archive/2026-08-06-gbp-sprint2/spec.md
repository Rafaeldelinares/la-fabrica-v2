# Delta Spec: GBP Ficha Improvements — Sprint 2

**Change**: `gbp-sprint2`
**Domain**: `clientes`
**Type**: Delta (adds REQ-5, REQ-6, and REQ-7 to `gbp-ficha-audit` capability from Sprint 1)
**Artifact**: `sdd/gbp-sprint2/spec`

---

## ADDED Requirements

### Requirement: REQ-5 — Robust Scraper Selectors for Core Fields

The GBP scraper MUST extract `descripcion`, `horarios_dias_cubiertos`, `atributos_seteados`, and `reviews_count` from Google Maps' 2026 DOM using a multi-fallback strategy. Each field extraction MUST attempt at least two independent locator strategies in order: (1) ARIA roles / semantic attributes, (2) CSS class patterns, (3) visible-text regex fallback. The scraper MUST prefer the first strategy that returns a non-empty, valid result; never silently discard a successful extraction in favor of an empty later one. Extraction failures (all strategies return empty) MUST preserve the current behavior of returning `null` / `0`, but at least one fallback MUST succeed when the underlying data exists in the page.

**Implementation constraints**:
- Every selector strategy MUST be wrapped in `try/except` per Sprint 1 discipline.
- A `console.warning` (stderr via `sys.stderr.write`) MUST be emitted when ALL strategies for a field fail and data was expected — surfaces silent failures to `journalctl -u gbp-ficha.service`.
- No regression on `rating_promedio`, `fotos_count`, `categorias_secundarias`, `posts_count`, `qa_count` — Sprint 1 extraction paths stay untouched.
- Canary fixture: cliente 693 (AG FITNESS BURGOS) — Google Maps shows `5.0 rating, 12 reviews, 15 fotos, 7-day horarios, 12/15 atributos, full description`.

#### Scenario: Descripcion extracted when full Google description is present

- GIVEN cliente 693 (AG FITNESS) has a 200+ character description on Google Maps
- WHEN the scraper audits `place_id = "ChIJ..."`
- THEN `audit_data.descripcion` is a non-null string ≥ 100 characters
- AND `audit_data.descripcion` does NOT contain any of the skip_phrases ("Compra en tienda", "Recogida en tienda", etc.)
- AND the first 50 characters do not include private/internal terms ("vista limitada", "Confirmado local")

#### Scenario: Horarios covers all 7 days when Google shows full week schedule

- GIVEN cliente 693 has horarios for all 7 days on Google Maps (e.g. "Lunes 9:00–21:00", "Martes 9:00–21:00", ..., "Domingo Cerrado")
- WHEN the scraper audits the place_id
- THEN `audit_data.horarios_dias_cubiertos` ≥ 6 (Domingo "Cerrado" counts)
- AND at least 3 distinct day names (lunes, martes, miércoles OR Mon/Tue/Wed abbreviations) appear in the extracted horarios text

#### Scenario: Reviews count extracted when Google shows total

- GIVEN cliente 693 has 12 reviews visible on Google Maps
- WHEN the scraper audits the place_id
- THEN `audit_data.reviews_count ≥ 10`
- AND the count is NOT zero
- AND `audit_data.reviews_respondidas_pct` is calculated (may be 0% if 0 responses)

#### Scenario: Atributos count matches Google attribute chips

- GIVEN cliente 693 has ~12 of 15 atributos set on Google Maps (e.g. "Se identifica como propiedad de mujeres", "Acceso para sillas de ruedas", "Aparcamiento adaptado", etc.)
- WHEN the scraper audits the place_id
- THEN `audit_data.atributos_seteados` ≥ 8
- AND `audit_data.atributos_seteados` ≤ `audit_data.atributos_total` (15)
- AND the count does NOT exceed the visible attribute chip count on the page

#### Scenario: Scraper falls back to body-text regex when primary selectors fail

- GIVEN Google Maps DOM has rotated CSS classes (e.g. `.WeS02d` no longer matches `descripcion`)
- WHEN all CSS selectors for `descripcion` return no visible element
- THEN the scraper attempts the visible-text regex fallback
- AND if the body text contains a paragraph ≥ 100 chars matching the description heuristic (not skip_phrases, not private terms), it is set as `audit_data.descripcion`
- AND a stderr warning is logged: `[gbp_scraper] descripcion: css_selectors_failed, regex_fallback_succeeded`

#### Scenario: Silent zero preserved when field is genuinely absent

- GIVEN a place_id has NO description on Google Maps (e.g. unclaimed business with empty About section)
- WHEN the scraper audits the place_id
- THEN `audit_data.descripcion = null`
- AND a stderr warning is logged: `[gbp_scraper] descripcion: all_strategies_failed (data likely missing)`
- AND no exception propagates (wrapper still returns 200 with `audit_data`)

---

### Requirement: REQ-6 — Competitive Analysis Endpoint

The system MUST expose a new n8n workflow `CRM_GBP_COMPETITIVE_ANALYZE` accepting POST `{ cliente_id, categoria, ciudad }` (all required, non-empty strings). The workflow MUST validate that the JWT contains `gbp.write` role (returns HTTP 403 otherwise — same RBAC pattern as Sprint 1 REQ-2). On success, the workflow MUST: (1) look up the cliente's latest audit from `clientes.gbp_audit_cache` via `place_id`, (2) call `POST /competitive-analyze` on the wrapper with `{ categoria, ciudad, top_n: 3, exclude_place_id: <cliente.place_id> }`, (3) normalize the wrapper response into a structured comparison JSON, (4) write a row to `clientes.gbp_audit_history` with `audit_source = 'competitive-analyze'`. The response MUST include per-competitor breakdown AND delta vs the cliente's own ficha for at least: `fotos_count`, `reviews_count`, `rating_promedio`, `horarios_dias_cubiertos`, `posts_count`. Top-3 competitors MUST be ranked by Google Maps' own ranking (default order from search results page); the wrapper MUST drop any place_id matching `exclude_place_id`.

**Request body shape**:
```json
{
  "cliente_id": 693,
  "categoria": "Entrenador personal",
  "ciudad": "Burgos"
}
```

**Response body shape** (HTTP 200):
```json
{
  "ok": true,
  "cliente": { "place_id": "ChIJ...", "fotos_count": 15, "reviews_count": 12,
               "rating_promedio": 5.0, "horarios_dias_cubiertos": 7,
               "posts_count": 3 },
  "competitors": [
    { "rank": 1, "place_id": "ChIJ_A", "nombre": "Top Gym Burgos",
      "fotos_count": 52, "reviews_count": 89, "rating_promedio": 4.8,
      "horarios_dias_cubiertos": 7, "posts_count": 12 },
    { "rank": 2, "place_id": "ChIJ_B", "nombre": "Studio Fitness Burgos", "...": "..." },
    { "rank": 3, "place_id": "ChIJ_C", "nombre": "Powerhouse Burgos", "...": "..." }
  ],
  "delta_vs_leader": {
    "fotos_count": -37, "reviews_count": -77, "rating_promedio": 0.2,
    "horarios_dias_cubiertos": 0, "posts_count": -9
  },
  "queried_at": "2026-08-06T18:30:00Z"
}
```

**Implementation constraints**:
- Top-3 selection MUST come from Google Maps search results page (`?q={categoria}+{ciudad}`).
- If the cliente's own ficha appears in the top-N results, the wrapper MUST skip it and pick the next one (still returning exactly 3 competitors if available).
- If fewer than 3 unique competitors exist (sparse category+city), return as many as found; `competitors.length` may be < 3.
- The endpoint MUST complete within 60 seconds (3 scrapes × ~15s each + search ~10s + headroom).
- NO caching of competitive results — every call is fresh.
- The frontend component `GbpBenchmark.jsx` MUST render within the unified GBP tab below `GbpFichaActual` and be visible to users with `gbp.read` (read-only display, no mutation).

#### Scenario: Competitive analysis returns 3 competitors ranked by Google

- GIVEN cliente 693 (AG FITNESS BURGOS, Entrenador personal, Burgos) has a valid `place_id`
- WHEN POST `crm-gbp-competitive-analyze` is called with `{ cliente_id: 693, categoria: "Entrenador personal", ciudad: "Burgos" }` and a valid JWT with `gbp.write`
- THEN the response contains exactly 3 competitors (or fewer if Google returns <3 unique non-self results)
- AND `competitors[0].rank === 1` is the Google Maps top result
- AND each competitor has non-null `nombre`, `place_id`, `fotos_count`, `reviews_count`, `rating_promedio`
- AND `delta_vs_leader.fotos_count === cliente.fotos_count - competitors[0].fotos_count` (negative when cliente has fewer)

#### Scenario: Cliente's own ficha excluded from competitors list

- GIVEN cliente 693's `place_id = "ChIJ_SELF"` and Google Maps search for "Entrenador personal Burgos" returns 4 results, #2 being "ChIJ_SELF"
- WHEN the wrapper processes the response
- THEN the final `competitors` array does NOT contain `place_id = "ChIJ_SELF"`
- AND the wrapper returns the next available result (rank #3 in raw search → presented as rank #2 in response) to fill the slot
- AND the response contains 3 competitors (assuming 4 unique non-self results exist)

#### Scenario: Sparse category+city returns fewer than 3 competitors

- GIVEN cliente is the only Entrenador personal in Ciudad Pequeña X
- WHEN the workflow is called
- THEN the response contains ≤ 2 competitors (whatever Google returned after exclusion)
- AND the response does NOT fabricate placeholder competitors
- AND `delta_vs_leader` is still computed against `competitors[0]` if any competitor exists, otherwise `delta_vs_leader = {}`

#### Scenario: Server-side rejects without gbp.write token

- GIVEN a JWT without `gbp.write` role (e.g. supervisor token)
- WHEN POST `crm-gbp-competitive-analyze` is invoked
- THEN the response is HTTP 403 with body `{ "ok": false, "code": 403, "error": "forbidden" }`
- AND no competitor scraping is triggered
- AND no row is written to `clientes.gbp_audit_history`

#### Scenario: Cliente without place_id returns validation error

- GIVEN cliente 999 has no `place_id` in `clientes` table
- WHEN POST `crm-gbp-competitive-analyze` is called with `{ cliente_id: 999, ... }`
- THEN the response is HTTP 400 with body `{ "ok": false, "code": 400, "error": "cliente_missing_place_id" }`
- AND no scraping is triggered
- AND the audit history row is NOT written

#### Scenario: Frontend renders benchmark table with delta column

- GIVEN the user has `gbp.read` and opens the GBP tab for cliente 693
- WHEN the user expands the Ficha actual section and the benchmark query resolves successfully
- THEN a "Benchmark del sector" sub-section appears with a 4-column table (métrica, cliente, top-1, top-2, top-3, delta vs líder)
- AND each metric row shows the cliente's value, the top-3 values, and the delta vs the leader
- AND delta values use color coding: positive deltas in slate-500 (cliente ahead), negative in amber-400 (cliente behind), red-400 (gap > 50%)

#### Scenario: Empty competitive result renders graceful empty state

- GIVEN the workflow returns `competitors: []` (no competitors found)
- WHEN the user expands the benchmark section
- THEN a message appears: "Sin competidores identificados en {ciudad} para {categoria}"
- AND no error toast is shown
- AND the section is collapsible (same UX as other GBP sections)

---

### Requirement: REQ-7 — Regression Alerts via Email

The system MUST detect significant regressions between consecutive audits of a cliente's GBP ficha and notify the configured recipient by email within 24 hours of detection. Detection runs as a **post-audit hook** in the wrapper (`/run` → after `save_history()` calls `_compute_and_save_alerts(prev_row, curr_row)`); email dispatch is **async** via a new n8n cron workflow `CRM_GBP_ALERTS_DISPATCH` (every 5 minutes) that reads unsent rows from `clientes.gbp_alerts`, groups by `cliente_id`, and sends one digest email per cliente via the existing SMTP credential (`informacion@ia-bybusiness.com`). Four alert types are supported: (a) **rating_drop** when the absolute rating drop ≥ 0.2 points, (b) **photos_drop** when the relative photos count drop ≥ 10%, (c) **reviews_drop** when the absolute reviews count drop ≥ 5 OR a new negative review (rating ≤ 2) appears without owner response within 24 hours, (d) **description_empty** when the description transitions from non-null/non-empty to null or empty string. The email destination MUST be sourced from `clientes.email_destinatario` when non-null, otherwise fall back to the global default `rafaeldelinares@gmail.com` (configurable in n8n credential env var). The frontend MUST expose a dismissable alert banner via a new `GbpAlerts.jsx` component (≤150 LOC) mounted under `GbpHeader`, showing the last N (default 10) undismissed alerts.

**Implementation constraints**:
- Detection is **idempotent**: re-running the post-audit hook on the same `(place_id, prev_audit_id, alert_type)` triple MUST NOT create a duplicate alert row — enforced by `UNIQUE (place_id, prev_audit_id, alert_type)` on `clientes.gbp_alerts`.
- Email dispatch is **resilient to SMTP failure**: rows persist with `sent_at IS NULL`; cron retries every 5 minutes until success.
- **No false positives**: only ABSOLUTE drops trigger alerts (e.g. rating fluctuation of ±0.05 must NOT fire `rating_drop`).
- **No alert spam**: the dispatch cron groups all unsent alerts for a single `cliente_id` into ONE digest email per dispatch tick (not one email per alert).
- New `clientes.gbp_alerts` table (append-only) and `clientes.email_destinatario TEXT` column added via idempotent migrations.
- Frontend `GbpAlerts.jsx` MUST NOT show alerts to users without `gbp.read` (read-only display); dismiss action requires `gbp.write`.

#### Scenario: REQ-7.1 — Rating drop ≥ 0.2 triggers email alert within 24h

- GIVEN cliente 693 has an audit with `rating_promedio = 4.8` recorded in `clientes.gbp_audit_history` at `T-7d`
- AND the global default email destination is `rafaeldelinares@gmail.com` (no `clientes.email_destinatario` override)
- WHEN a new audit completes via `POST /run` with `rating_promedio = 4.5` at `T`
- THEN `clientes.gbp_alerts` has a row with `alert_type='rating_drop'`, `cliente_id=693`, `severity='medium'`, `delta_json` containing `{ "prev": 4.8, "curr": 4.5, "delta": -0.3 }`
- AND within 24 hours (target: within 10 minutes via 5-min cron) the dispatch workflow marks the row `sent_at IS NOT NULL`
- AND exactly ONE email is delivered to `rafaeldelinares@gmail.com` with subject containing "AG FITNESS" and body showing the rating drop value
- AND no additional row is created for the same `(place_id, prev_audit_id, 'rating_drop')` triple on a re-run of the post-audit hook

#### Scenario: REQ-7.2 — Photos count drop ≥ 10% triggers email alert

- GIVEN cliente 693 has a previous audit with `fotos_count = 20`
- WHEN a new audit completes with `fotos_count = 17` (a 15% relative drop)
- THEN `clientes.gbp_alerts` has a row with `alert_type='photos_drop'`, `severity='low'`, `delta_json` containing `{ "prev": 20, "curr": 17, "delta_pct": -15.0 }`
- AND the dispatch workflow sends a digest email within 24h
- AND when `fotos_count` drops from 20 → 19 (5% relative drop, below threshold) NO `photos_drop` row is created

#### Scenario: REQ-7.3 — New negative review without owner response >24h triggers email alert

- GIVEN cliente 693 has a previous audit where the latest negative review (rating ≤ 2) is at `T-3d` and owner has responded
- WHEN a new audit completes with a new negative review appearing at `T` (no owner response present in the scrape)
- AND the new review has been visible >24 hours at the time of the new audit
- THEN `clientes.gbp_alerts` has a row with `alert_type='reviews_drop'`, `severity='high'`, `delta_json` containing `{ "trigger": "new_negative_no_response", "review_age_hours": 25 }`
- AND the dispatch workflow sends an email flagged as HIGH severity (subject prefixed `[HIGH]`)
- AND when the negative review HAS an owner response in the scrape, NO `reviews_drop` row is created for that review

#### Scenario: REQ-7.4 — Description becomes empty triggers email alert

- GIVEN cliente 693 has a previous audit with `descripcion` non-null and ≥100 characters
- WHEN a new audit completes with `descripcion = null` or empty string
- THEN `clientes.gbp_alerts` has a row with `alert_type='description_empty'`, `severity='medium'`, `delta_json` containing `{ "prev_length": 250, "curr_length": 0 }`
- AND the dispatch workflow sends an email within 24h
- AND when `descripcion` was already empty in the previous audit AND remains empty, NO `description_empty` row is created (no spurious alerts on already-empty state)

#### Scenario: REQ-7.5 — User can configure email destination via DB column

- GIVEN `clientes.email_destinatario` is `NULL` for cliente 693
- WHEN an alert fires for cliente 693
- THEN the email is sent to the global default `rafaeldelinares@gmail.com`
- AND when `UPDATE clientes SET email_destinatario = 'test@example.com' WHERE id = 693` is executed
- AND a new alert fires for cliente 693
- THEN the email is sent to `test@example.com` (NOT the global default)
- AND other clientes without override continue to receive emails at the global default
- AND setting `email_destinatario = NULL` again restores default destination

#### Scenario: REQ-7.6 — No email sent when no significant changes detected

- GIVEN cliente 693 has a previous audit with `rating=4.8, fotos_count=20, reviews_count=12, descripcion="..."` (250 chars)
- WHEN a new audit completes with `rating=4.75, fotos_count=20, reviews_count=12, descripcion="..."` (255 chars) — all deltas BELOW thresholds
- THEN NO new rows are inserted into `clientes.gbp_alerts`
- AND the dispatch workflow finds zero unsent alerts and sends no email
- AND the frontend `GbpAlerts` component shows the previous (already-dismissed or expired) state unchanged
- AND a stable audit produces zero alert rows over time (verified by `SELECT COUNT(*) FROM clientes.gbp_alerts WHERE cliente_id = 693 AND created_at > NOW() - INTERVAL '7 days'` returning 0 after 7 days of stable audits)

#### Scenario: REQ-7.7 — Frontend renders dismissable alert banner

- GIVEN cliente 693 has 3 undismissed alerts in `clientes.gbp_alerts` (rating_drop, photos_drop, description_empty)
- AND the user has `gbp.read` and `gbp.write` permissions
- WHEN the user opens the GBP tab for cliente 693
- THEN `GbpAlerts.jsx` renders below `GbpHeader` showing 3 banner rows with alert_type icon, delta value, and timestamp
- AND each banner has a dismiss button (× icon, top-right)
- WHEN the user clicks dismiss on the rating_drop banner
- THEN `POST crm-gbp-alerts-dismiss` is called with `{ alert_id, cliente_id: 693 }` and the JWT contains `gbp.write`
- AND the row in `clientes.gbp_alerts` has `dismissed_at IS NOT NULL` set to the current timestamp
- AND the frontend removes that banner from the rendered list (optimistic update)
- AND a user with only `gbp.read` (no `gbp.write`) sees the banners but the dismiss button is disabled with tooltip "Requires gbp.write"

#### Scenario: REQ-7.8 — SMTP failure does not lose alerts (resilient dispatch)

- GIVEN the SMTP credential returns 5xx for a dispatch tick at `T`
- WHEN `CRM_GBP_ALERTS_DISPATCH` cron runs at `T`
- THEN the dispatch attempt is logged to stderr with `[gbp_alerts] smtp_failure: <error>`
- AND the unsent alert rows remain in `clientes.gbp_alerts` with `sent_at IS NULL`
- AND when SMTP recovers at `T+10min`
- THEN the next cron tick at `T+10min` successfully sends the backlog and marks `sent_at`
- AND the frontend `GbpAlerts` component shows the alerts regardless of SMTP status (read from DB directly)

---

## Out of Scope (Sprint 3+)

- Historical competitor tracking or weekly diff
- Scheduled cron-driven competitive audits (`audit_source = 'competitive-scheduled'`)
- Caching competitive results for N hours (always fresh in Sprint 2)
- Multi-region competitor comparison (single ciudad only)
- Reverse-lookup: discovering cliente's `categoria` and `ciudad` automatically from place_id (caller provides)
- Qwen-generated natural language summary of competitive gaps
- Scoring competitors by relevance (e.g. distance from cliente)
- Removing competitors that are chains/franchises vs local businesses
- Google Business Profile API (paid) integration
- Email/Slack alerts when COMPETITOR crosses threshold (S2C handles SELF audit regressions only)
- Slack / SMS / push notification channels (S2C is email-only)
- Daily-digest mode for self-audit alerts (S2C sends one email per alert cluster per dispatch tick)
- Multi-recipient email routing per cliente (one email destination per cliente in S2C)
- Per-cliente threshold tuning (S2C thresholds are global; per-cliente overrides deferred to Sprint 3+)
- Auto-reply to negative reviews from within the alert workflow (alert-only, no action)

---

## API Contract Notes

All frontend-to-backend communication MUST use n8n workflows:

| Operation | n8n Workflow | Webhook | Method |
|---|---|---|---|
| Run audit (existing) | `CRM_GBP_FICHA_AUDIT` | `crm-gbp-ficha-audit` | POST |
| Competitive analyze (NEW) | `CRM_GBP_COMPETITIVE_ANALYZE` | `crm-gbp-competitive-analyze` | POST |
| Wrapper scraper (existing) | n/a | `http://localhost:8095/run` | GET (n8n internal) |
| Wrapper competitive (NEW) | n/a | `http://localhost:8095/competitive-analyze` | POST (n8n internal) |
| Wrapper alert check (NEW S2C, internal) | n/a | `http://localhost:8095/check-alerts` | POST (n8n internal, called from `/run` post-audit hook) |
| Alerts dispatch (NEW S2C, cron) | `CRM_GBP_ALERTS_DISPATCH` | n/a (cron every 5 min, no inbound webhook) | n/a |
| Alerts list (NEW S2C) | `CRM_GBP_ALERTS_LIST` | `crm-gbp-alerts-list` | GET (JWT `gbp.read`) |
| Alerts dismiss (NEW S2C) | `CRM_GBP_ALERTS_DISMISS` | `crm-gbp-alerts-dismiss` | POST (JWT `gbp.write`) |

Server-side workflow MUST validate JWT role — `gbp.write` for competitive and dismiss, `gbp.read` for alerts list. Same pattern as Sprint 1 REQ-2 server gate.