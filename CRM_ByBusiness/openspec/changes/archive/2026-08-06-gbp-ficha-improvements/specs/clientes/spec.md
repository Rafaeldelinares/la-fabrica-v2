# Delta Spec: GBP Ficha Improvements — Sprint 1

**Change**: `gbp-ficha-improvements`
**Domain**: `clientes`
**Type**: Delta (ADDED only — no existing spec.md found)
**Artifact**: `sdd/gbp-ficha-improvements/spec`

---

## ADDED Requirements

### Requirement: REQ-1 — Unified GBP Tab with Collapsible Sections

The system SHALL render a single GBP tab in `ClienteDrawer` that replaces both `TabOptimizacionGbp` and `TabGbp`. The tab MUST contain five collapsible sections: Header (score + cache status), Ficha actual, Audit, Histórico, and Gestión place_id. Each collapsible section MUST be implemented as a sub-component no larger than 150 LOC (GGA discipline). The tab MUST use Navy Industrial styling (`bg-slate-950`, `rounded-sm`, JetBrains Mono for data values). Sections labeled Ficha actual, Audit, and Histórico MUST be read-only for users with only `gbp.read`; only admin (via `gbp.write`) MAY mutate place_id in the Gestión section.

**Implementation constraints**:
- All sub-components MUST be ≤150 LOC.
- No direct DB access — all persistence via n8n workflows.
- Tab MUST be imported and rendered by `ClienteDrawer.jsx` instead of the two legacy tabs.

#### Scenario: Unified GBP tab renders all five collapsible sections

- GIVEN the user has `gbp.read` and opens `ClienteDrawer` for a client with a `place_id`
- WHEN the GBP tab is selected
- THEN five collapsible sections appear: Header, Ficha actual, Audit, Histórico, Gestión place_id
- AND each section defaults to collapsed except Header

#### Scenario: Supervisor sees read-only ficha and audit sections

- GIVEN a supervisor user (has `gbp.read`, lacks `gbp.write`) opens the GBP tab
- WHEN the user expands the Ficha actual, Audit, and Histórico sections
- THEN all data is displayed
- AND the Gestión place_id section shows no edit controls
- AND no save, auditar, or refresh buttons are active

#### Scenario: Admin sees full controls in Gestión place_id section

- GIVEN an admin user (has `gbp.write`) opens the GBP tab
- WHEN the user expands the Gestión place_id section
- THEN edit controls for place_id are visible and functional
- AND save and auditar buttons are active

#### Scenario: Sub-components respect 150 LOC limit

- GIVEN a developer audits component line counts in the unified GBP tab
- WHEN counting lines in each `.jsx` file under the GBP tab directory
- THEN every sub-component file is ≤150 LOC

---

### Requirement: REQ-2 — RBAC Mutation Gates

The system MUST enforce `gbp.write` permission for every mutation action in the unified GBP tab. All read actions MUST verify at least `gbp.read`. RBAC checks MUST be implemented internally within each action handler using `useRbac.can()` — no "trust the parent" delegation pattern. Server-side n8n workflows MUST validate the JWT role token before executing any mutation; cache bypass via direct webhook call MUST be rejected server-side when the token lacks `gbp.write`. The system MUST expose an RBAC test matrix covering admin, supervisor, and operador roles across all GBP actions.

**Action-to-permission mapping**:
| Action | Required Permission |
|---|---|
| View GBP tab | `gbp.read` |
| Run audit | `gbp.write` |
| Save place_id | `gbp.write` |
| Refresh cache | `gbp.write` |
| View histórico | `gbp.read` |

#### Scenario: Admin executes all GBP write actions

- GIVEN an admin user is authenticated
- WHEN the admin triggers any GBP mutation (run audit, save place_id, refresh cache)
- THEN the action succeeds
- AND the RBAC guard `useRbac.can('gbp.write')` returns true

#### Scenario: Supervisor blocked from GBP write actions

- GIVEN a supervisor user (has `gbp.read`, lacks `gbp.write`) attempts to run an audit
- WHEN the supervisor clicks the Auditar button
- THEN the button is disabled or the action is rejected
- AND the system shows no error toast (fail silently at UI level)

#### Scenario: Operador cannot access GBP tab

- GIVEN an operador user (lacks `gbp.read`) attempts to open the GBP tab
- WHEN the user navigates to ClienteDrawer
- THEN the GBP tab is not visible or accessible

#### Scenario: Server-side rejects cache bypass without gbp.write token

- GIVEN a direct n8n webhook call is made to `crm-gbp-ficha-audit` without a valid `gbp.write` role in the JWT
- WHEN the workflow validates the token
- THEN the request is rejected with HTTP 403
- AND no audit data is written

---

### Requirement: REQ-3 — Append-Only Audit History + Drift Detection

The system MUST extend `clientes.gbp_audit_cache` (or create `clientes.gbp_audit_history`) to store audit records as append-only rows, never overwriting. Each history row MUST contain: `audit_id` (UUID), `place_id`, `cliente_id`, `audit_data JSONB`, `cached_at` (timestamp), `scrape_duration_ms` (integer), `audit_source` (enum: 'manual', 'cache-refresh', 'scheduled'). The existing 24-hour read-through cache MUST be preserved as a fast-path query, while all writes append to history. The system MUST compute drift between consecutive audits, exposing: `fotos_added` (integer), `reviews_count_delta` (integer), `rating_delta` (numeric), `reviews_respondidas_delta` (integer), `descripcion_changed` (boolean). A new query `crm-gbp-audit-history` MUST return the last N audits for a given `place_id` ordered by `cached_at` DESC.

**Drift computation rules**:
- Compare each new audit against the immediately prior audit for the same `place_id`.
- If no prior audit exists, all deltas are zero/null and `descripcion_changed` is false.

#### Scenario: First audit for a place_id produces null drift

- GIVEN a client has no prior audit history for `place_id = "ChIJ..."`
- WHEN the first audit is run
- THEN `fotos_added = 0`, `reviews_count_delta = 0`, `rating_delta = 0`, `reviews_respondidas_delta = 0`, `descripcion_changed = false`
- AND a history row is created with `audit_source = 'manual'`

#### Scenario: Second audit computes correct drift from previous

- GIVEN a place has one prior audit with `reviews_count = 42`, `rating = 4.5`, `fotos_count = 10`
- WHEN a new audit returns `reviews_count = 45`, `rating = 4.6`, `fotos_count = 14`
- THEN `reviews_count_delta = 3`, `rating_delta = 0.1`, `fotos_added = 4`
- AND `descripcion_changed` reflects whether the description text differs

#### Scenario: Migration preserves existing cache rows and appends new history rows

- GIVEN `clientes.gbp_audit_cache` has 50 existing rows for various `place_id` values
- WHEN the migration runs
- THEN each existing row is preserved and also appended to `gbp_audit_history` with `audit_source = 'manual'`
- AND new audits after migration append new rows without overwriting

#### Scenario: Invalid place_id returns graceful error

- GIVEN an audit is requested for `place_id = "invalid_id"`
- WHEN the scraper returns an error or empty result
- THEN the history row is NOT created
- AND the UI shows a user-friendly error message

---

### Requirement: REQ-4 — Gap Analysis Prioritized (Deterministic First)

The system MUST provide a service `compute_gaps(place_id, audit_data)` that returns a list of `Gap` objects sorted by severity. Each `Gap` MUST contain: `code` (string), `severity` ('high' | 'med' | 'low'), `human_label` (string), `expected_impact_label` (string). The computation MUST be deterministic using regex and heuristics only — NOT LLM-driven. The following gap types MUST be detected:

| Gap Code | Severity | Condition |
|---|---|---|
| `missing_horario_dia` | high | No horario for any day (regex on `horarios` field) |
| `descripcion_corta` | high | Description text < 200 characters |
| `fotos_insuficientes` | high | `fotos_count` < 10 |
| `categoria_secundaria` | med | No secondary category detected |
| `sin_posts_gbp` | med | `posts_count = 0` |
| `qa_sin_responder` | med | Any unanswered Q&A entry |
| `website_no_enlazado` | med | No website URL in audit data |
| `telefono_oculto` | low | Phone field present but marked hidden |

`expected_impact_label` MUST be qualitative free text (e.g., "Missing horarios confuse local search users — likely reduces map pack visibility") — no fake statistics. The UI MUST render the top 5 gaps first in the Audit section of the unified tab.

**Out of scope for this sprint**: Qwen/LLM summarization of gaps, PDF reports, email alerts.

#### Scenario: Client with multiple gaps shows top 5 sorted by severity

- GIVEN a client audit returns 7 gaps across all severity levels
- WHEN `compute_gaps` is called
- THEN gaps are sorted: all 'high' first, then 'med', then 'low'
- AND the UI displays at most the top 5 gaps in the Audit section

#### Scenario: Client with no gaps shows empty gap list

- GIVEN a client has complete GBP data: horarios filled, description ≥ 200 chars, ≥ 10 fotos, secondary category, posts, no unanswered Q&A, website linked, phone visible
- WHEN `compute_gaps` is called
- THEN an empty list is returned
- AND the Audit section shows "Sin gaps detectados — ficha completa"

#### Scenario: Gap detection is deterministic across runs

- GIVEN a fixed `audit_data` snapshot for `place_id = "ChIJ..."`
- WHEN `compute_gaps` is called twice with the same data
- THEN the output gap list is identical
- AND no randomness or non-determinism is observed

#### Scenario: New gap type identified by regex is flagged as high

- GIVEN a new `horarios` field shows "Monday: Closed" but Tuesday through Sunday are absent
- WHEN `compute_gaps` runs its `missing_horario_dia` regex check
- THEN a gap with `code = 'missing_horario_dia'` and `severity = 'high'` is returned

---

## Out of Scope (Sprint 2+)

The following items are explicitly NOT part of this spec:

- PDF report generation and email alerts
- Campaign triggers based on gap scores
- Advanced NLP or LLM-driven gap analysis
- Qwen-generated summaries of audit results (future optional enhancement)
- Changes to payment, subscription, or multi-tenant behavior
- Google Business Profile API integration (paid API)
- Granting supervisors `gbp.write` permission

---

## API Contract Notes

All frontend-to-backend communication for GBP operations MUST use n8n workflows:

| Operation | n8n Workflow | Webhook |
|---|---|---|
| Run audit | `CRM_GBP_FICHA_AUDIT` | `crm-gbp-ficha-audit` |
| Save place_id | (existing save workflow) | TBD per design |
| Refresh cache | (existing refresh workflow) | TBD per design |
| Get audit history | New query | `crm-gbp-audit-history` |

Server-side workflow MUST validate JWT role before executing mutations.
