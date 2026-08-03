# Proposal: CRM 3 Areas — Improvements (Capture/Reception, Operator Calls, Admin Profile)

**Change:** `crm-3-areas-improvements`
**Phase:** sdd-propose
**Artifact:** `openspec/changes/crm-3-areas-improvements/proposal/proposal.md`
**Delivery strategy:** `force-chained` (chained PRs from slice 01; 800-line review budget per PR)
**Model:** opus (architectural decisions + slice orchestration)
**Date:** 2026-08-01

---

## Intent

The CRM_ByBusiness frontend has 3 known operational gaps (Engram obs 1384 + obs 1385 + explore.md): (A) **Captura + Reputación** is read-only / stubbed while scrapers are DOWN; (B) **Operador** has no callback management, no live KPIs, and a "useEffect + n8nGet" anti-pattern; (C) **Admin** has 37 components without RBAC, no audit trail UI, no backup panel. This change delivers concrete, sliceable improvements across all 3 areas as **chained PRs from slice 01**, with each PR independently reviewable and reversible. P3 toggles stay paused; this change does not fix them.

## Scope

### In Scope
- 14 chained PR slices covering all 3 areas + 3 cross-cuts (R6 dev DB gap, "Fase X" labels, error boundaries).
- 12 new n8n workflows + 2 workflow extensions; no DB schema changes.
- New components + targeted refactors under `src/`. Existing Navy Industrial style preserved (rounded-sm, slate-950, #D00000 accent, JetBrains Mono for data, no inline styles, no console.log, no localhost fallbacks, setTimeout with clearTimeout).
- Frontend never hits DB — all data via n8n workflows.

### Out of Scope (deferred or blocked)
- P3 toggles fix (paused; requires scraper restoration on VPS).
- Multi-tenant (already reverted — ByBusiness-exclusive).
- E2E test infrastructure expansion beyond 1 smoke spec per slice.
- Vitest config + real unit tests (covered by P2 in obs 1384).
- Direct DB access from frontend (architectural invariant — already enforced).
- New RBAC permissions not defined in this change unless a slice explicitly requires them.

---

## Capabilities

> Contract with sdd-spec. `openspec/specs/` is currently empty; every capability below is **new** (becomes a new full spec, not a delta).

### New Capabilities
- `lead-callbacks` — operator-side callback list + reschedule/cancel; admin-side visibility.
- `operator-live-kpis` — real-time strip (calls today, ventas hoy, tasa conversión, duración media) in `OperatorDashboard` Zone4.
- `lead-freeze-list` — UI for frozen leads from "no_contesta" + manual unfreeze.
- `lead-assignment-explainability` — campaign/priority/source tooltip in Zone1 lead assignment.
- `react-query-operator-data` — migration of `useOperatorData` from `useEffect + n8nGet` to `useN8nQuery`.
- `scraper-health-panel` — admin panel surfacing nano/heavy/maps last-run status.
- `scraper-config-panel` — admin panel for depth, frequency, localities, categories.
- `reputation-feed` — live wiring of Monitor Reputación engine `:8092` into `Zone2Content` `REPUTACIÓN` tab.
- `lead-freshness-config` — admin UI to set the contactability threshold (currently 90d hardcoded).
- `rescrape-trigger` — manual "Forzar rescrape" button in `ClienteDrawer` GBP tab.
- `admin-audit-trail` — admin panel reading `sistema.eventos_sistema` (cross-entity: user mgmt, campaign changes, lead reassignments).
- `backup-operations` — admin panel for backup status + restore + schedule.
- `admin-error-boundaries` — React error boundaries posting to `sistema.eventos_sistema` via `CRM_60_POST_EVENTO_SISTEMA`.
- `stale-phase-label-cleanup` — remove meaningless "Fase X" labels from `GbpPanel` and landing.

### Modified Capabilities
None (no existing specs in `openspec/specs/`).

---

## Slice Plan (14 chained PRs, ≤800 changed lines each)

| # | Area | Slice | Files (est.) | Lines (est.) | Depends on | Workflow changes |
|---|------|-------|--------------|--------------|------------|------------------|
| S01 | Cross | Stale "Fase X" label cleanup (LOW priority, quick win) | 2 | ~80 | none | none |
| S02 | Cross | Admin error boundaries + `eventos_sistema` reporting (P6) | 3 | ~450 | none | extend `CRM_60_POST_EVENTO_SISTEMA` with new event_type `FRONTEND_ERROR` |
| S03 | Cross | R6 dev-DB gap: `eventos_sistema` local fallback + README note | 2 | ~250 | S02 | none (frontend-only shim) |
| S04 | B | Operator live KPI strip in Zone4 of `OperatorDashboard` | 3 | ~350 | none | new `CRM_OPERADOR_KPI_LIVE` |
| S05 | B | Callback management panel (`MisCallbacksPanel`) | 4 | ~650 | S04 | new `CRM_CALLBACKS_GESTIONAR` (cancel + reschedule actions) |
| S06 | B | `useOperatorData` → `useN8nQuery` migration | 2 | ~250 | S04 | none |
| S07 | B | No-contesta freeze list + lead assignment transparency tooltip | 3 | ~500 | S04 | new `CRM_LEADS_FREEZED_LIST` + extend `CRM_LEADS_DISPONIBLES` payload |
| S08 | C | Admin audit trail panel (`AdminAuditPanel`) | 4 | ~700 | S03 | new `CRM_ADMIN_AUDIT_GET` |
| S09 | C | Backup management panel (`BackupPanel`) | 4 | ~600 | S03 | new `CRM_BACKUP_STATUS` + `CRM_BACKUP_RESTORE` |
| S10 | C | RBAC cluster (P1) — usuarios + leads + gbp cluster (8 components) | 9 | ~750 | none | none |
| S11 | A | Scraper health panel + `CRM_SCRAPER_HEALTH` workflow | 4 | ~600 | none | new `CRM_SCRAPER_HEALTH` (aggregates nano/heavy/maps) |
| S12 | A | Reputation tab live wiring in `Zone2Content` | 3 | ~450 | S11 | new `CRM_REPUTACION_LEAD` (calls Go engine `:8092`) |
| S13 | A | Rescrape trigger in `ClienteDrawer` + freshness config UI | 4 | ~550 | S11 | new `CRM_GBP_RESCRAPE` + `CRM_LEAD_FRESHNESS_CONFIG` |
| S14 | A | Scraper configuration panel | 5 | ~750 | S11 | new `CRM_SCRAPER_CONFIG_GET` + `CRM_SCRAPER_CONFIG_UPDATE` |

**Ordering rationale:** S01–S03 are foundational cross-cuts (cheapest, unblock downstream safety). S04–S07 deliver Area B in full (no external dependencies, smallest blast radius). S08–S10 deliver Area C. S11 is the dependency root for Area A (R1 mitigation), and S12–S14 fan out from it. Each slice fits the 800-line review budget.

---

## Slice Acceptance Criteria & Rollback (summary)

Each slice MUST have: explicit files list, component-line-count check (≤150 lines/component, refactor if larger), 1 E2E smoke spec (in `e2e/`), no new RBAC unless called out, no inline styles, no console.log, no mock data, no localhost fallback, setTimeout with clearTimeout.

| Slice | Acceptance criteria | Rollback boundary |
|-------|---------------------|--------------------|
| S01 | "Fase 9" / "Fase 3" labels removed; status badges added where meaningful. | Revert the label swap; no data change. |
| S02 | Errors thrown in `OperatorDashboard` zones produce 1 row in `sistema.eventos_sistema`. | Remove the `<ErrorBoundary>` wrapper; events stay in DB but are harmless. |
| S03 | Local dev env logs frontend errors to `console.error` AND POSTs to `eventos_sistema` if table exists. | Delete the shim; P6 events lost in dev only (acceptable). |
| S04 | Zone4 shows 4 KPIs that refresh every 30s; no perf regression on `useOperatorData`. | Disable `CRM_OPERADOR_KPI_LIVE` workflow; Zone4 returns to static `MisResultados` link. |
| S05 | Operator can list/reschedule/cancel today's callbacks; state stays in sync with `CRM_WATCHDOG_CALLBACKS`. | Disable `CRM_CALLBACKS_GESTIONAR`; UI shows "temporalmente no disponible". |
| S06 | `useOperatorData` uses `useN8nQuery`; same fields returned; loading state via React Query. | `git revert` the hook; old `useEffect + n8nGet` restored. |
| S07 | Frozen leads list visible in `MisResultados`; "Asignado por" tooltip shows campaign + priority. | Hide new section via flag; tooltip removed. |
| S08 | Admin can filter audit events by user/type/date; reads from VPS `crm_bybusiness.sistema.eventos_sistema`. | Set feature flag to disable; existing `AuditoriaPanel` keeps working. |
| S09 | Backup list + restore button; restore requires explicit admin role + typed confirmation. | Restore button disabled by flag. |
| S10 | 8 admin components (UsuariosList, AgendaGlobalPanel, GbpPanel, BackupPanel candidates, etc.) wrap in `useRbac`. | Each component unwraps individually — `useRbac` is opt-in. |
| S11 | Panel shows last-run + status for nano/heavy/maps with 60s refresh. | Disable `CRM_SCRAPER_HEALTH`; UI shows "Servicio no disponible". |
| S12 | `REPUTACIÓN` tab loads score + last reviews + alert state; loading skeleton shown. | Keep stub text; revert `Zone2Content` tab body only. |
| S13 | "Forzar rescrape" button + freshness config field both write to n8n. | Disable `CRM_GBP_RESCRAPE` + revert DB function call from `crm.asignar_lead`. |
| S14 | Scraper parameters editable via UI; config persisted; effect observable in next run. | Revert to env-var config; UI shows "Configuración via variables de entorno". |

---

## Cross-Cuts Addressed

| Cross-cut (from explore §6) | Slice handling |
|------------------------------|----------------|
| Stale "Fase X" labels | **S01** (dedicated) |
| React Query coverage uneven | **S06** (dedicated for `useOperatorData`); S04–S09 use `useN8nQuery` for new components |
| Error boundary strategy (P6) | **S02** (dedicated) |
| R6 dev DB gap (`eventos_sistema` absent in local `crm_bybusiness`) | **S03** (dedicated shim); S08 handles read-only gracefully |
| R8 RBAC migration needs chained PR | **S10** is the first chained RBAC slice; additional RBAC slices can be added in future changes |

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/dashboard/OperatorDashboard.jsx` | Modified | S04 (Zone4 KPI strip), S06 (RQ migration) |
| `src/components/dashboard/zones/Zone2Content.jsx` | Modified | S12 (REPUTACIÓN tab) |
| `src/components/dashboard/MisCallbacksPanel.jsx` | New | S05 |
| `src/components/dashboard/MisResultados.jsx` | Modified | S07 (freeze list section) |
| `src/components/dashboard/zones/Zone1Filters.jsx` | Modified | S07 (assignment tooltip) |
| `src/hooks/useOperatorData.js` | Modified | S06 |
| `src/modules/admin/auditoria/AdminAuditPanel.jsx` | New | S08 |
| `src/modules/admin/backup/BackupPanel.jsx` | New | S09 |
| `src/modules/admin/scraper/ScraperStatusPanel.jsx` | New | S11 |
| `src/modules/admin/scraper/ScraperConfigPanel.jsx` | New | S14 |
| `src/modules/admin/gbp/GbpPanel.jsx` | Modified | S01 (label), S10 (RBAC) |
| `src/modules/admin/agenda/AgendaGlobalPanel.jsx` | Modified | S13 (freshness config), S10 (RBAC) |
| `src/modules/admin/usuarios/UsuariosList.jsx` | Modified | S10 (RBAC) |
| `src/modules/admin/leads/ClienteDrawer.jsx` | Modified | S13 (rescrape button), S10 (RBAC) |
| `src/shared/errors/ErrorBoundary.jsx` | New | S02 |
| `src/shared/errors/reportError.js` | New | S02 + S03 |
| `src/shared/hooks/useN8n.js` | Unchanged (already provides `useN8nQuery`) | — |
| `e2e/*.spec.js` | New | 1 spec per slice (14 total) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| R1 — Scraper health endpoint doesn't exist (Area A HIGH) | High | S11 ships the workflow + UI; backend prep (scraper `/health` endpoint) coordinated in `infra/` repo, not in this change. Document dependency in S11 acceptance. |
| R2 — Monitor Reputación engine contract unconfirmed | Med | S12 first calls a dry-run workflow that returns mock shape if engine down; production wiring after contract confirmed. |
| R3 — 90-day threshold change requires DB function update | Med | S13 first ships UI + workflow storing config in `sistema.configuracion`; DB function read path updated in a follow-up change (not in this one). |
| R4 — Callback watchdog queue conflict (S05) | Med | S05 acceptance requires verifying `CRM_WATCHDOG_CALLBACKS` doesn't double-process taken callbacks; coordination with infra team in slice comments. |
| R5 — Operator live KPI aggregation workflow doesn't exist | Low (S04 creates it) | S04 ships `CRM_OPERADOR_KPI_LIVE` from scratch. |
| R6 — `sistema.eventos_sistema` absent in local dev | High | S03 mitigates with shim; S08 handles empty-data gracefully. |
| R7 — Scraper config API not exposed (env-var only) | High | S14 acceptance requires backend prep first (scraper config endpoint); if blocked, defer S14 to a future change and document. |
| R8 — Full RBAC migration requires chained PR | Med | S10 covers 8 components; future changes add more. P1 plan explicitly is chained. |
| Cross-PR budget exceeded | Med | Each slice has ≤800 lines target; PR review rejects if exceeded → split further. |
| New RBAC permission needed mid-slice | Med | Flag explicitly; defer to future change rather than expand scope. |

## Rollback Plan

- Per-slice rollback boundaries are listed above.
- Global rollback: revert merged PRs in reverse order (S14 → S01). No DB migrations; only `sistema.configuracion` row insertions from S13 are reversible by deleting the row.
- Workflows created in this change can be deactivated in n8n without affecting other workflows (each has its own webhook path).

## Dependencies

- **External (out of repo):** Monitor Reputación Go engine (`:8092`) contract must be confirmed before S12 ships to production. Scraper `/health` endpoint must exist before S11 ships.
- **Internal:** No DB schema changes; `crm_bybusiness.sistema.eventos_sistema` must remain on VPS (no schema change).
- **Tooling:** Vitest remains placeholder-only; new components ship E2E smoke specs via Playwright only (consistent with current testing strategy).

## Success Criteria

- [ ] All 14 slices merged; each PR ≤800 changed lines.
- [ ] No new RBAC permissions introduced unless explicitly approved per slice.
- [ ] At least one E2E spec per slice passes.
- [ ] Navy Industrial style preserved (rounded-sm, slate-950, #D00000, JetBrains Mono for data); zero inline styles; zero console.log; zero mock data; zero localhost fallbacks; zero P3 fixes.
- [ ] Frontend never accesses PostgreSQL directly (verifiable by grep).
- [ ] `useRbac` covers 11+ admin components after S10 (3 already covered + 8 added).
- [ ] `sistema.eventos_sistema` contains rows of type `FRONTEND_ERROR` triggered by tests in S02.
- [ ] Area A monitor (S11) shows scraper status as "DOWN" for nano/heavy/maps (validating real-world state).
- [ ] Area B operator KPI strip (S04) shows correct values within 5% of `CRM_RESULTADOS_OPERADOR_SIM` for any operator with >5 calls today.
- [ ] Area C admin audit panel (S08) lists at least 1 system event per event_type after exercising CRUD actions in dev.
- [ ] All 14 slices pass the verify phase (`sdd-verify`) before archive.

---

## Result Contract (returned to orchestrator)

- **status**: ok
- **artifact_path**: `openspec/changes/crm-3-areas-improvements/proposal/proposal.md`
- **memory_topic**: `sdd/crm-3-areas-improvements/proposal`
- **next_recommended**: `sdd-spec` (each capability listed above → `openspec/changes/crm-3-areas-improvements/specs/{capability}/spec.md`)
- **risks**: see table; top blockers are R1, R6, R7 (all external).
