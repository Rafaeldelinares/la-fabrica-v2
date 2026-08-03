# Exploration: CRM 3 Operational Areas — Improvement Opportunities

**Change:** `crm-3-areas-improvements`
**Phase:** sdd-explore
**Artifact:** `openspec/changes/crm-3-areas-improvements/explore/explore.md`
**Model:** haiku (bounded exploration)
**Date:** 2026-08-01

---

## 1. Exploration Goal

Surface concrete, evidence-backed improvement opportunities in the three CRM operational pillars, cross-referenced against the existing P1–P10 plan (Engram obs 1384) and P3 root causes (Engram obs 1385). No code changes, no workflow changes, no DB writes.

---

## 2. Area A — Captura de datos Google Maps + Verificador de Reputación (Fresh Data)

### Current State (6 evidence bullets)

| # | Evidence | Source |
|---|----------|--------|
| A1 | Scrapers (nano/heavy/maps) have been DOWN since ~2026-05-09. No fresh GBP data has been ingested for ~3 months. | P1–P10 plan (obs 1384) |
| A2 | The `REPUTACIÓN` tab in `Zone2Content.jsx:426–442` is a **stub**: shows "Próximamente" with hardcoded placeholder text. It has zero integration with the Monitor Reputación engine. | `Zone2Content.jsx` lines 426–442 |
| A3 | `GbpPanel.jsx` is marked "Fase 9" and acts as a read-only GBP listing (Dashboard + Fichas tabs). It shows a `FichaInfoModal` that only displays basic data and redirects to `ClienteDrawer` for actual management. | `GbpPanel.jsx:90–142` |
| A4 | The Playwright-based scraper infrastructure lives under `monitor-go/scrapers-playwright/scraper-base.js`. `scrapeGoogleMaps()` detects list vs. single-place mode and extracts ratings, review counts, address, and place_id. | `scraper-base.js:25–142` |
| A5 | There is **no scraper health dashboard** inside the CRM. Operators/admins cannot see whether nano/heavy scrapers are running, when they last succeeded, or what the last error was. | No related workflow or panel found |
| A6 | Lead freshness is currently gated by a 90-day threshold (temporarily extended from 30 days due to stale scraper data). Re-scraping cadence is not configurable from the CRM UI. | P1–P10 plan; `crm.asignar_lead` + `CRM_KPI_DASHBOARD_V2` |

### Cross-reference with P1–P10

| P item | Relationship to Area A |
|--------|-----------------------|
| P1 (RBAC 8+ components) | **Indirect** — admin GBP management panels need RBAC coverage too |
| P3 (3 empty Agenda toggles) | **Already investigated (obs 1385)** — `gbp_snapshot` and `gbp_autorepair` empty because `alimentador_reputacion` cron is DOWN. Out of scope for this exploration but confirms the scraper/systemic issue |
| P6 (Error boundaries + eventos_sistema reporting) | **Direct** — error boundaries could surface scraper failures into `sistema.eventos_sistema` for visibility |

### New Improvements Not Covered by P1–P10

1. **HIGH — Scraper health panel in CRM**: A new admin panel (or Agenda extension) showing nano/heavy/maps status, last run time, last error. No such panel exists. Blast radius: new `ScraperStatusPanel` component + n8n workflow to query scraper health endpoints. ~2–3 files. Delivery: 1 chained PR.
2. **HIGH — Reputation tab live integration**: Wire the Monitor Reputación engine (`:8092`) into the `REPUTACIÓN` tab in `Zone2Content`. Currently a stub. Requires: n8n workflow that calls the Go engine, frontend display component. Blast radius: `Zone2Content` (1 file). ~3 files total.
3. **MEDIUM — Rescrape trigger in ClienteDrawer GBP tab**: Add a "Forzar rescrape" button in the GBP tab of `ClienteDrawer` that POSTs to a new n8n workflow `CRM_GBP_RESCRAPE`. Allows admins to manually refresh stale GBP data without waiting for cadence. Blast radius: `ClienteDrawer` + new workflow. ~3 files.
4. **MEDIUM — Freshness configuration UI**: Replace the hardcoded 90-day constant with an admin-configurable field in `AgendaGlobalPanel` or a dedicated `ConfiguracionPanel`. Blast radius: small — adds a setting row. ~2 files.
5. **LOW — GbpPanel phase label cleanup**: `GbpPanel.jsx:117` still says "Fase 9" — this label is meaningless to operators. Remove or replace with a meaningful status badge. Trivial, 1 file.

### Risks and Unknowns

- **R1**: The scraper DOWN status is confirmed informally; no explicit runbook or monitoring exists for the scraper containers. Any scraper health panel depends on first establishing a health endpoint on the scraper services.
- **R2**: The Monitor Reputación Go engine at `:8092` has a specific webhook contract (`POST /webhook/scraper/go`). Its output schema must be confirmed before wiring the `REPUTACIÓN` tab.
- **R3**: Changing the 90-day freshness threshold requires coordination with the DB function `crm.asignar_lead` — this is a DB change, not just frontend.

---

## 3. Area B — Gestión de Llamadas de Operadores

### Current State (6 evidence bullets)

| # | Evidence | Source |
|---|----------|--------|
| B1 | `OperatorDashboard` has 4 zones: Zone1Filters (lead selection), Zone2Content (call execution), Zone3Sidebar (history), Zone4Sidebar (callbacks/progress). Pattern is well-established. | `OperatorDashboard.jsx:28–54` + `OperatorSkeleton.jsx` |
| B2 | Lead assignment uses `CRM_LEADS_DISPONIBLES` via `useOperatorData` hook. The n8n distribution logic (3 priority queues, 30s cadence) is in the workflow, not visible to the operator. | `useOperatorData.js` + `CRM_LEADS_DISPONIBLES` workflow |
| B3 | Call results (venta, callback, no_interesa, error, etc.) are registered via popup modals in `Zone2Content` → POST to `CRM_REGISTRAR_RESULTADO` / `CRM_02_REGISTRAR_RESULTADO_V2`. 7 result types defined. | `Zone2Content.jsx:64–174`, `BOTONES_RESULTADO` array |
| B4 | `AuditoriaPanel` shows a filtered call history table with KPIs (total, ventas, callbacks, tasa conversión, duración media). It uses `crm-auditoria-llamadas` workflow. RBAC guard: `reportes.read` permission. | `AuditoriaPanel.jsx:71–86` |
| B5 | Callbacks are managed via dedicated workflows: `CRM_CALLBACKS_HOY`, `CRM_CALLBACKS_OPERADOR`, `CRM_TOMAR_CALLBACK`, and watchdog `CRM_WATCHDOG_CALLBACKS`. These are all in n8n; the CRM only reads today's callbacks in Zone1. | Workflow list from `infraestructura.workflows_n8n` |
| B6 | Training mode (`en_practicas` role) has a separate flow: `CRM_LEADS_ENTRENAMIENTO_FIX`, `CRM_INICIAR_SESION_ENTRENAMIENTO_FIX`. `OperatorDashboard` detects training mode and shows training lead data. | `OperatorDashboard.jsx:34`, `EntrenamientoPanel` |

### Cross-reference with P1–P10

| P item | Relationship to Area B |
|--------|-----------------------|
| P1 (RBAC 8+ components) | **Direct** — `OperatorDashboard` and `AuditoriaPanel` already use `useRbac`. 4 more admin components in this area need coverage. |
| P2 (Vitest tests) | **Direct** — no tests for `useOperatorData`, `Zone2Content` popup flows, or result registration. |
| P4 (React Query 35 components) | **Partial** — `AuditoriaPanel` already uses React Query. `OperatorDashboard` uses `useOperatorData` (a custom hook calling `n8nGet` directly, not React Query). |
| P5 (Backend RBAC extended) | **Direct** — `reportes.read` guard exists; other workflows (callbacks, lead assignment) have no RBAC. |

### New Improvements Not Covered by P1–P10

1. **HIGH — Callback management panel**: Operators currently see callbacks only as a count badge in Zone1. There is no dedicated panel to view, reschedule, or cancel upcoming callbacks. A new `MisCallbacksPanel` (operator-scoped) would fill this gap. Blast radius: new panel + `CRM_CALLBACKS_OPERADOR` already returns full callback list. ~3 files.
2. **HIGH — Operator performance live KPI**: `AuditoriaPanel` shows historical data only. Operators have no real-time view of their own conversion rate, calls today, or revenue this week. A "Mis KPIs" strip in Zone4 of `OperatorDashboard` would provide live feedback. Blast radius: `OperatorDashboard` + `useOperatorData` extension. ~2–3 files.
3. **MEDIUM — Lead assignment transparency**: Operators cannot see why they got a specific lead (campaign, priority, source). Adding a tooltip/popover in Zone1 showing "Asignado por: campaña X, prioridad alta" would improve trust in the distribution algorithm. Blast radius: `Zone1Filters` or `LeadAssignmentBadge`. ~1–2 files.
4. **MEDIUM — "No contesta" freeze management**: When an operator marks "no_contesta", the lead gets a freeze period. There is no UI to see which leads are frozen, for how long, or to manually unfreeze. A freeze list in `MisResultados` (existing panel) would close this gap. Blast radius: existing `MisResultados` component. ~2 files.
5. **MEDIUM — OperatorDashboard React Query migration**: `useOperatorData` uses direct `n8nGet` inside `useEffect`, not React Query. Migrating it to `useN8nQuery` would give automatic stale-time, retry, and loading state management. Blast radius: `OperatorDashboard` and `useOperatorData`. ~2 files.

### Risks and Unknowns

- **R4**: The callback watchdog (`CRM_WATCHDOG_CALLBACKS`) runs in n8n. Any new callback management UI must not conflict with the watchdog logic — need to review if taking a callback removes it from the watchdog queue.
- **R5**: Operator live KPIs would require a new n8n workflow (or extension of existing ones) that aggregates today's activity. The data exists in `crm_bybusiness` tables but no single workflow aggregates it for operator self-service.

---

## 4. Area C — Gestión del Perfil Administrador

### Current State (6 evidence bullets)

| # | Evidence | Source |
|---|----------|--------|
| C1 | `UsuariosList.jsx` is a full-featured user management panel: CRUD, 2FA (3-state toggle: active/obligatory/disabled), absence/baja with delegation, suspension/reactivation, and horarios. It is the most complete admin panel in the CRM. | `UsuariosList.jsx:305–694` |
| C2 | RBAC coverage: `LeadsPanel`, `ClienteDrawer`, `AuditoriaPanel` use `useRbac`. 37 admin components do NOT use it (P1–P10 obs 1384). `useRbac` wraps `can()`, `canAll()`, `canAny()` and `getPermissionsForUser()`. | `useRbac.js:15–25` |
| C3 | `AgendaGlobalPanel` has 12 toggles; 9 working, 3 empty (`gbp_snapshot`, `gbp_autorepair`, `envio_proforma_email`). Root cause: `alimentador_reputacion` cron DOWN; email canal never used. | P3 investigation (obs 1385) |
| C4 | Backup and system health are visible as Agenda toggles (`backup_sistema`, `cron_sistema`), but there is no dedicated admin panel for backup management, scraper configuration, or system monitoring. | `AgendaGlobalPanel` |
| C5 | `AuditoriaPanel` uses RBAC (`reportes.read` gate) and shows call history with KPIs. It is the only panel with a structured audit trail UI. Other admin actions (user creation, lead assignment, campaign changes) are not audited in the CRM UI. | `AuditoriaPanel.jsx:77–86` |
| C6 | `GbpPanel` is labeled "Fase 9" and is read-only. There is no admin control for: triggering re-scrapes, configuring GBP fields to capture, setting minimum rating thresholds, or enabling/disabling GBP auto-repair. | `GbpPanel.jsx:90–142` |

### Cross-reference with P1–P10

| P item | Relationship to Area C |
|--------|-----------------------|
| P1 (RBAC 8+ components) | **Core focus** — 37 components need RBAC wrapping. Admin area has the most components needing coverage. |
| P3 (3 empty Agenda toggles) | **Already investigated** — `gbp_snapshot`/`gbp_autorepair` root cause known; email toggle is a workflow creation decision. Out of scope here. |
| P5 (Backend RBAC extended) | **Direct** — `UsuariosList` backend workflows (`CRM_USUARIOS_CREATE`, `CRM_USUARIOS_EDITAR`, etc.) only validate auth, not role-gated operations. |
| P6 (Error boundaries) | **Direct** — admin panels need error boundaries that report to `sistema.eventos_sistema`. |
| P7 (API contracts doc) | **Direct** — all admin workflows (user mgmt, backup, scraper) lack documented API contracts. |

### New Improvements Not Covered by P1–P10

1. **HIGH — Admin audit trail panel (cross-entity)**: `AuditoriaPanel` only shows call records. Admin actions (user create/delete, campaign changes, lead reassignments) are not logged to a CRM-visible audit trail. A new `AdminAuditPanel` reading from `sistema.eventos_sistema` would give admins visibility into who changed what and when. Blast radius: new panel + `AuditoriaPanel` RBAC guard already exists. ~3–4 files. Delivery: 1–2 chained PRs.
2. **HIGH — Backup management panel**: Currently admins see a binary Agenda toggle. A dedicated `BackupPanel` would show: last backup timestamp, backup size, restore options, and schedule configuration. Blast radius: new panel + n8n backup workflow. ~3–4 files.
3. **MEDIUM — Scraper configuration panel**: Admins have no UI to configure scraper parameters (depth, frequency, localities to scan, categories to exclude). A `ScraperConfigPanel` would replace the informal config-in-code approach. Blast radius: new panel + new n8n workflow. ~4–5 files (review budget risk — recommend chained PR).
4. **MEDIUM — RBAC coverage for remaining admin panels**: P1 targets 8 components. The admin area has ~40 components; full RBAC coverage is a multi-sprint effort. A structured RBAC migration plan with component prioritization (most critical first) would make this manageable. This is partially covered by P1 but needs explicit scoping.
5. **MEDIUM — Agenda "Fase 9" label cleanup in GbpPanel**: Like Area A's "Fase 9" label, this is misleading. Remove stale phase labels throughout the admin UI. Trivial, 1 file.

### Risks and Unknowns

- **R6**: `sistema.eventos_sistema` lives on the VPS DB (`crm_bybusiness`), not local. Any new audit panel must handle the case where the local dev environment has no audit data.
- **R7**: A scraper configuration panel requires the scraper services to expose a config update API. If scrapers are configured purely via environment variables / code, a config panel is a significant backend addition.
- **R8**: Full RBAC migration across 37 components will produce large PRs. The chained-PR strategy (800-line budget) is appropriate; each PR should cover 1 functional cluster (e.g., leads cluster, cartera cluster, users cluster).

---

## 5. Summary of All Improvements by Priority

### Area A — Captura / Reputación

| Priority | Improvement | Files (est.) | PRs (est.) |
|----------|-------------|--------------|------------|
| HIGH | Scraper health panel | 2–3 | 1 |
| HIGH | Reputation tab live wiring | 3 | 1 |
| MEDIUM | Rescrape trigger in ClienteDrawer | 3 | 1 |
| MEDIUM | Freshness threshold UI config | 2 | 1 |
| LOW | "Fase 9" label cleanup | 1 | — |

### Area B — Llamadas de Operadores

| Priority | Improvement | Files (est.) | PRs (est.) |
|----------|-------------|--------------|------------|
| HIGH | Callback management panel | 3 | 1 |
| HIGH | Operator live KPI strip | 2–3 | 1 |
| MEDIUM | Lead assignment transparency | 1–2 | 1 |
| MEDIUM | No-contesta freeze management | 2 | 1 |
| MEDIUM | useOperatorData → React Query | 2 | 1 |

### Area C — Perfil Administrador

| Priority | Improvement | Files (est.) | PRs (est.) |
|----------|-------------|--------------|------------|
| HIGH | Admin audit trail panel | 3–4 | 1–2 |
| HIGH | Backup management panel | 3–4 | 1–2 |
| MEDIUM | Scraper configuration panel | 4–5 | 2 |
| MEDIUM | RBAC migration plan + P1 execution | 3–4/sprint | chained |
| LOW | "Fase 9" label cleanup | 1 | — |

---

## 6. Cross-Cutting Observations

1. **Phase labels ("Fase X") are meaningless**: Both `GbpPanel` and the landing page components show "Fase 9", "Fase 3" labels that mean nothing to operators. These should be removed or replaced with meaningful status badges.
2. **React Query coverage is uneven**: `AuditoriaPanel` migrated to React Query; `OperatorDashboard` still uses `useEffect + n8nGet` via a custom hook. This is the gap P4 targets.
3. **Error boundary strategy is missing**: No component in the admin area has an error boundary that reports to `sistema.eventos_sistema`. P6 addresses this but the implementation approach (which component first, what data to send) is undecided.
4. **P3 root causes are PAUSED but not lost**: `gbp_snapshot`/`gbp_autorepair` empty toggles require the `alimentador_reputacion` cron to be restored. `envio_proforma_email` requires a workflow decision. These are blocked on scraper restoration, not on the CRM itself.

---

## 7. Risks to Confident Prioritization

| Risk | Description | Blocks |
|------|-------------|--------|
| R1 | Scraper health endpoint doesn't exist yet | Area A HIGH items |
| R2 | Monitor Reputación engine contract (`:8092`) not confirmed | Area A HIGH (reputation tab) |
| R3 | 90-day threshold change requires DB function update | Area A MEDIUM |
| R4 | Callback watchdog queue conflict for new callback UI | Area B HIGH |
| R5 | Operator live KPI aggregation workflow doesn't exist | Area B HIGH |
| R6 | `sistema.eventos_sistema` not present in local dev | Area C HIGH (audit panel) |
| R7 | Scraper config API not exposed (env-var only) | Area C MEDIUM |
| R8 | Large RBAC migration requires chained PR coordination | Area C MEDIUM |

---

## 8. Ready for Proposal

**Yes — with caveats.**

Each of the 3 areas has 2–3 HIGH priority items that are self-contained enough to become separate SDD proposals. The recommended next step is to run `sdd-propose` for **Area B (operator calls) HIGH items** first — specifically the callback management panel and live KPI strip — as they have the clearest scope, smallest blast radius, and no blocked dependencies (unlike Area A which depends on scraper health being established first).

Area C HIGH items (audit trail + backup panel) should be proposed second as they require understanding the `sistema.eventos_sistema` schema on the VPS.

Area A HIGH items should be proposed third once scraper health is restored, as they depend on an external service being available.

---

## 9. P3 Status Note

P3 root causes (obs 1385) were **already investigated**: `gbp_snapshot`/`gbp_autorepair` are empty because the `alimentador_reputacion` cron is DOWN. `envio_proforma_email` is empty because no email sends have ever occurred. **These are explicitly out of scope for this exploration and are paused until scraper restoration.** They are noted here for completeness.
