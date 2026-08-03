# Design: CRM 3 Areas — Improvements (Capture, Operator, Admin)

**Change:** `crm-3-areas-improvements`
**Phase:** sdd-design
**Date:** 2026-08-01
**Delivery strategy:** `force-chained` (14 slices, ≤800 changed lines each, commits ≤3 files)

---

## 1. Technical Approach

Concrete, sliceable improvements across 3 CRM areas + 3 cross-cuts (stale "Fase X" labels, P6 error boundaries, R6 dev-DB gap). 14 chained PRs (S01–S14) ordered foundation → Area B → Area C → Area A. No DB schema changes; frontend never hits PostgreSQL (rule: `openspec/config.yaml` `rules.design`). All new admin/operator UI routes through n8n workflows (12 new + 2 extensions).

References: `openspec/changes/crm-3-areas-improvements/explore/explore.md`, `proposal/proposal.md`, and specs in `specs/{capability}/spec.md` (S01, S02, S03 produced; S04–S14 spec-only deferred).

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 19 + Vite)                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ Area A: Captura  │  │ Area B: Operador │  │ Area C: Admin    │   │
│  │ GbpPanel         │  │ OperatorDashboard│  │ UsuariosList     │   │
│  │ ClienteDrawer    │  │ MisCallbacksPanel│  │ AgendaGlobalPanel│   │
│  │ ScraperStatusPn  │  │ MisResultados    │  │ AdminAuditPanel  │   │
│  │ ScraperConfigPn  │  │ Zone1..4 + KPIs  │  │ BackupPanel      │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘   │
│           └──────────┬──────────┴──────────────────────┘            │
│                      ▼                                               │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │ SHARED LAYER                                             │       │
│   │  ErrorBoundary (S02) ──► reportError ──► CRM_60_POST_…  │       │
│   │  useRbac / useN8nQuery / useN8nMutation / useOperatorData│       │
│   └──────────────────────────────────────────────────────────┘       │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTPS webhooks only
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         n8n BFF (VPS)                                │
│  CRM_60_POST_EVENTO_SISTEMA  (extend: FRONTEND_ERROR event_type)     │
│  CRM_OPERADOR_KPI_LIVE       (S04 new)                               │
│  CRM_CALLBACKS_GESTIONAR     (S05 new)                               │
│  CRM_LEADS_FREEZED_LIST      (S07 new)                               │
│  CRM_ADMIN_AUDIT_GET         (S08 new)                               │
│  CRM_BACKUP_STATUS/RESTORE   (S09 new)                               │
│  CRM_SCRAPER_HEALTH          (S11 new)                               │
│  CRM_REPUTACION_LEAD         (S12 new)                               │
│  CRM_GBP_RESCRAPE            (S13 new)                               │
│  CRM_LEAD_FRESHNESS_CONFIG   (S13 new)                               │
│  CRM_SCRAPER_CONFIG_GET/UPDATE (S14 new)                             │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ SQL only via n8n workflows
                               ▼
        PostgreSQL :5432 (local dev) | :5433 (VPS tunnel)
        crm_bybusiness.sistema.eventos_sistema, sistema.configuracion
```

---

## 3. Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|--------------|-----------|
| AD-1 | Where new ErrorBoundary lives | `src/shared/errors/ErrorBoundary.jsx` (replace existing `OperatorErrorBoundary.jsx`) | Keep both; create alongside | Existing `OperatorErrorBoundary.jsx` (154 LOC) only `console.error`s; no per-zone wrapping. Generalize + move under `shared/` so admin panels reuse it (S02 spec). |
| AD-2 | reportError transport | `n8nPost('crm-60-post-evento-sistema', …)` reusing existing `n8nFetch` retry/timeout | Direct fetch, queue with retry lib | Reuses `useN8n.js` invariants (12s timeout, 1 retry, no localhost fallback). |
| AD-3 | Dev shim activation | `import.meta.env.DEV` from Vite (already in use at `OperatorErrorBoundary:87`) | Build-time flag | Already canonical in repo (`OperatorErrorBoundary.jsx` line 87). No new env. |
| AD-4 | React Query migration | `useN8nQuery` for S04–S09; S06 migrates legacy `useOperatorData` | Stay on `useEffect+n8nGet` | `useN8nQuery` exists (`useN8n.js:127`) but no production use yet; this change makes it canonical. `AuditoriaPanel` uses raw `useQuery` — accept that pattern, do not refactor in scope. |
| AD-5 | `useOperatorData` migration shape | Thin aggregator: 5 separate `useN8nQuery` calls + `useN8nMutation`; preserve the public return shape | Rewrite as new hook | S06 keeps callers unchanged (OperatorDashboard.jsx:57 destructures 8 fields). Public-API stable. |
| AD-6 | New RBAC permissions | None — reuse `admin.system.config`, `reportes.read`, `leads.assign` | Add `audit.read`, `backup.restore`, `scraper.config` | Spec says "no new RBAC unless explicitly approved per slice" — none of S04–S14 require new permissions; existing set covers all 8 S10 components. |
| AD-7 | Data tables S13 will write | `sistema.configuracion` row only (key/value); no schema change | New schema/table | Proposal §R3 explicitly defers DB schema change. Workflow `CRM_LEAD_FRESHNESS_CONFIG` writes via `INSERT … ON CONFLICT`. |
| AD-8 | Where S13 freshness UI lives | New `src/modules/admin/agenda/FreshnessConfigCard.jsx` mounted inside `AgendaGlobalPanel` via composition | Edit `AgendaGlobalPanel.jsx` (740 LOC) | GGA cap: any inline edit of 740-LOC file risks regressions. Card ≤150 LOC. |
| AD-9 | Same pattern for S10 RBAC | `useRbac()` call at top of each admin component (early-return guard) | HOC wrapper | Already the established pattern in `AuditoriaPanel.jsx:72-86`. No new abstraction. |
| AD-10 | E2E coverage | 1 smoke spec per slice added to `e2e/`; CI unchanged | Add Vitest unit tests | `openspec/config.yaml` `testing.unit.available: false`; only Playwright is wired. Per proposal. |
| AD-11 | i18n / UI copy | English in source; copy in `Zone2Content` style (Spanish) is **existing** pattern; new components use English. | Translate all | Spec + persona contract: new code/UI strings = English by default. Existing Spanish in legacy components stays untouched (out of scope). |
| AD-12 | Visual style | Navy Industrial: `bg-slate-950`, `rounded-sm`, `#D00000` accents, `JetBrains Mono` for data, skeleton screens only (no spinners), zero inline styles | New design tokens | Codified in `AGENTS.md` + `openspec/config.yaml` `context`; reuse `src/shared/ui/{Card,Badge,Skeleton,Stat}`. |

---

## 4. Data Model

| Element | Action | Notes |
|---------|--------|-------|
| `crm_bybusiness.sistema.eventos_sistema` | Read (S08) | Already exists on VPS. S03 dev shim assumes absent in local dev. |
| `crm_bybusiness.sistema.eventos_sistema` | Write (S02) | Existing workflow `CRM_60_POST_EVENTO_SISTEMA`; extend accepted `event_type` enum with `FRONTEND_ERROR`. |
| `crm_bybusiness.sistema.configuracion` | R/W (S13) | New logical table for key/value config (lead freshness threshold). Row insert only; no schema migration (DB schema is immutable per P3). |
| `crm_bybusiness.lead.lead` | Read (S07) | Existing table; `CRM_LEADS_FREEZED_LIST` filters `WHERE freeze_until > NOW()`. |
| `crm_bybusiness.lead.lead_asignacion` | Read (S07) | Existing; join for "Asignado por" tooltip payload in `CRM_LEADS_DISPONIBLES`. |
| `crm_bybusiness.scraper.run_log` | Read (S11/S14) | Existing or new in monitor-go; `CRM_SCRAPER_HEALTH` aggregates 3 sources (nano/heavy/maps). |

No new columns anywhere. No DB schema change. All writes go via n8n.

---

## 5. Auth / RBAC Matrix

| Component | Slice | Permission Guard | Notes |
|-----------|-------|------------------|-------|
| `OperatorDashboard` | (existing) | `reportes.read` (already wrapped) | Continue as-is; S06 changes data flow only. |
| `MisCallbacksPanel` | S05 | None | Operator's own callbacks; no new permission needed. |
| `MisKpiStrip` (new) | S04 | None | Self-KPI; operator-only by nature. |
| `AdminAuditPanel` | S08 | `reportes.read` | Same gate as `AuditoriaPanel`. |
| `BackupPanel` | S09 | `admin.system.config` | Matches existing admin convention. |
| `ScraperStatusPanel` | S11 | `admin.system.config` | Read-only monitor; admin-only. |
| `ScraperConfigPanel` | S14 | `admin.system.config` | Config editor. |
| `FreshnessConfigCard` | S13 | `admin.system.config` | Threshold setter. |
| `ClienteDrawer` (cartera) | S13 | already wrapped | `Forzar rescrape` button hidden if `!rbac.can('admin.system.config')`. |
| `Zone1Filters` (assignment tooltip) | S07 | None | Read-only explainability; operators see it. |
| `MisResultados` (freeze list) | S07 | None | Self-data. |
| 8 admin components S10 | S10 | mixed (see AD-6) | No new permissions introduced. |

**Remain unprotected** (with explicit follow-up note): `CampanasPanel`, `CandidatosPanel`, `GeneradorCampanasPanel`, `AnalisisInteligentePanel`, `ConflictoLeadsModal`, `AsignarOperadoresModal`, `CrearDesdeBusquedaModal`, `CampanaDrawer`, `CampanaEstadoBadge`, `CampanasAnalisisPanel`, `CarteraPanel`, `NuevoClienteDrawer`, `RegistrarInteraccionModal`, `ClienteSidePanel`, `LeadsLandingPanel`, `LeadLandingRow`, `LeadRow`, `AsignameUnLead`, `HorarioModal`, `GbpDashboardPanel`, `GbpFichasPanel`, `FacturacionPanel`, `VentasPanel`, `WhatsAppPanel`, `Projects`, `StatusCard`, `Teleprompter`, `ClientTimeline`, `AgendaPersonal`, `Sidebar`, `Dashboard`. Future chained changes must cover them; tracked in `sdd-init/crm_bybusiness` (P1 list).

---

## 6. Error Handling

- **AD-1 generalization**: `src/shared/errors/ErrorBoundary.jsx` accepts optional `zoneId` prop. On catch: calls `reportError(error, { zoneId, componentStack })`. Renders inline fallback (Navy Industrial skeleton + retry button) inline with the surrounding layout — does not collapse the whole dashboard.
- **reportError** in `src/shared/errors/reportError.js`: `n8nPost('crm-60-post-evento-sistema', payload)`. `payload = { event_type: 'FRONTEND_ERROR', error_message, component_stack, zone_id, timestamp, user_id }`. Wrapped in `try/catch` so network failure does not propagate (does not block fallback render).
- **S03 dev shim**: same `reportError`; in `import.meta.env.DEV` also calls `console.error`. Never blocks UI. `CONTRIBUTING.md` documents dev DB gap and tunnel requirement.
- **Existing OperatorErrorBoundary.jsx**: deleted in S02; imports redirected. Single canonical boundary.

---

## 7. Caching / Query Strategy

| Pattern | Used For | Migrated In |
|---------|----------|-------------|
| `useN8nQuery(key, path, opts)` | All new GET calls (S04–S14) | Introduced canonically here. |
| `useN8nMutation(path, opts)` | All new POST calls (S05/S08/S09/S13/S14) | Same. |
| `useOperatorData` (legacy) | Operator data | S06: refactored to compose 5 `useN8nQuery` + 1 `useN8nMutation`. Public shape preserved. |
| Raw `useQuery + n8nGet` | `AuditoriaPanel` (existing) | **Out of scope** — explicit follow-up. |
| `useEffect + n8nGet/n8nPost` | `OperatorDashboard.jsx` (lines 74–124, 130–141) — `cargarDatosZone1`, refresh cadence | S06 leaves alone (it lives inside `useOperatorData`). S04 adds a 30s polling `useN8nQuery` for KPIs. |

Default `staleTime` 30s for KPI panels; 60s for health panels; manual refetch for actions.

---

## 8. Dev / Prod Parity

- Local dev DB (`crm_bybusiness` on `:5432`) lacks `sistema.eventos_sistema`. **S03 shim** makes `reportError` graceful: it always POSTs; if n8n responds with table-missing, the error is swallowed + `console.error` in DEV. Production never logs to console.
- VPS tunnel (`tunnel-postgres-vps.service`) is required for `CRM_ADMIN_AUDIT_GET` (S08) to return rows. If tunnel is down, panel shows skeleton + "Servicio no disponible" (not a crash).
- No localhost fallback anywhere. All webhooks use `VITE_N8N_URL` (no hardcoded URL). Localhost dev only via `n8n-mcp-local` (workflows run in `fabrica-n8n` Docker container).
- Workflows that don't exist in local n8n (because they're VPS-only): all 12 new workflows in this change. Acceptable: dev environment doesn't have them; affected UI shows skeleton with "Pendiente de despliegue" message.

---

## 9. Performance / Security / Operability

- **Performance**: 30s poll cadence for KPIs, 60s for scraper health. React Query dedupes window-focus refetches.
- **Security**: Frontend never accesses PostgreSQL (architectural invariant); all writes via `n8nPost` with prepared statements in n8n workflows. New `sistema.configuracion` row insert uses `INSERT … ON CONFLICT DO UPDATE` (atomic).
- **Operability**: All new workflows accept `{ es_simulacion: 'true'|'false' }` (existing convention from `useOperatorData.js:5`). Errors land in `sistema.eventos_sistema` (S02), viewable via S08 panel.

---

## 10. Cross-Cuts (dedicated sections)

### 10.1 Stale "Fase X" labels (S01)
Two known occurrences: `GbpPanel.jsx:117` ("Fase 9") and landing page (TBD by `grep`). S01 replaces each numeric phase with a meaningful status badge (e.g., "Solo lectura" with `text-slate-500`). No backend change.

### 10.2 P6 error boundaries (S02 + S03)
See §6. AD-1 generalizes existing boundary; per-zone wrapping for `OperatorDashboard` (4 boundaries, one per zone) so Zone2 crash doesn't kill Zone1/3/4.

### 10.3 R6 dev-DB gap (S03)
`reportError` works in dev via `console.error` + best-effort POST. S08 audit panel handles empty result sets with skeleton state. `CONTRIBUTING.md` documents tunnel requirement.

### 10.4 R8 RBAC chained migration
S10 covers 8 admin components (cluster: usuarios + leads + gbp + agenda). Future change will cover the remaining ~20. No new permissions.

---

## 11. Per-Slice Design Notes

> Each slice ≤800 changed lines. Workflow contracts (id, name, endpoint) — no JSON generation.

### S01 — stale-phase-label-cleanup

| Aspect | Detail |
|--------|--------|
| Spec | `specs/stale-phase-label-cleanup/spec.md` |
| Files | `src/modules/admin/gbp/GbpPanel.jsx` (modify: drop "Fase 9" badge at line 117) + landing page component (TBD by `rg "Fase [0-9]" src/`) |
| Workflows | none |
| Hooks/Components | none |
| Acceptance dep | none |
| Rollback | Revert the label swap; no data change |

### S02 — admin-error-boundaries

| Aspect | Detail |
|--------|--------|
| Spec | `specs/admin-error-boundaries/spec.md` |
| Files | `src/shared/errors/ErrorBoundary.jsx` (new, ~80 LOC), `src/shared/errors/reportError.js` (new, ~60 LOC), `src/components/dashboard/OperatorDashboard.jsx` (wrap 4 zones), `src/components/dashboard/OperatorErrorBoundary.jsx` (delete) |
| Workflows | extend `CRM_60_POST_EVENTO_SISTEMA` accept `event_type='FRONTEND_ERROR'` |
| DB changes | none (schema unchanged) |
| Rollback | Unwrap zones; existing boundary stub left as fallback |

### S03 — dev-eventos-shim

| Aspect | Detail |
|--------|--------|
| Spec | `specs/dev-eventos-shim/spec.md` |
| Files | `src/shared/errors/reportError.js` (add `import.meta.env.DEV` branch), `CONTRIBUTING.md` (new, dev DB gap note) |
| Workflows | none |
| Rollback | Delete shim; events lost in dev only |

### S04 — operator-live-kpis

| Aspect | Detail |
|--------|--------|
| Files | `src/components/dashboard/MisKpiStrip.jsx` (new, ≤150 LOC), `src/components/dashboard/OperatorDashboard.jsx` (mount strip in Zone4), `src/components/dashboard/zones/Zone3Sidebar.jsx` (re-render to include strip if room) |
| Workflows | new `CRM_OPERADOR_KPI_LIVE` (GET; returns `{ calls_today, ventas_today, tasa_conversion, duracion_media }`) |
| Hooks | `useN8nQuery(['kpis-live', userId], 'crm-operador-kpi-live', { refetchInterval: 30_000 })` |
| Acceptance dep | none |
| Rollback | Strip removed from Zone4; falls back to static `MisResultados` link |

### S05 — lead-callbacks (MisCallbacksPanel)

| Aspect | Detail |
|--------|--------|
| Files | `src/components/dashboard/MisCallbacksPanel.jsx` (new, ≤150 LOC), `src/components/dashboard/OperatorDashboard.jsx` (mount in Zone4 below KPIs), `src/components/dashboard/MisCallbacksPanel.test.js` (smoke E2E) |
| Workflows | new `CRM_CALLBACKS_GESTIONAR` (POST; actions: `cancel`, `reschedule`; payload `{ callback_id, action, new_date? }`) |
| RBAC | none (operator self) |
| Acceptance dep | **R4 verification**: confirm with infra team that `CRM_WATCHDOG_CALLBACKS` doesn't double-process after `cancel`. |
| Rollback | Hide panel via flag |

### S06 — react-query-operator-data

| Aspect | Detail |
|--------|--------|
| Files | `src/hooks/useOperatorData.js` (rewrite, preserve public return shape), `src/components/dashboard/OperatorDashboard.jsx` (no signature change) |
| Workflows | none |
| Internals | 5 `useN8nQuery` (callback-programadas, llamada-activa, stats, campanas, historial) + 1 `useN8nMutation` (registrar-resultado). Returns same `{ llamadaActiva, historial, stats, campanas, loading, error, … }`. |
| Rollback | `git revert`; legacy `useEffect+n8nGet` restored |

### S07 — lead-freeze-list + lead-assignment-explainability

| Aspect | Detail |
|--------|--------|
| Files | `src/components/dashboard/MisFreezeList.jsx` (new, ≤120 LOC), `src/components/dashboard/zones/Zone1Filters.jsx` (add assignment tooltip), `src/components/dashboard/MisResultados.jsx` (mount freeze list section) |
| Workflows | new `CRM_LEADS_FREEZED_LIST` (GET; returns `{ lead_id, freeze_until, reason }[]`); extend `CRM_LEADS_DISPONIBLES` payload with `{ campaign, priority, source }` per lead |
| RBAC | none (self) |
| Rollback | Hide list section; tooltip removed |

### S08 — admin-audit-trail

| Aspect | Detail |
|--------|--------|
| Files | `src/modules/admin/auditoria/AdminAuditPanel.jsx` (new, ≤150 LOC), `src/shared/layout/WorkBody.jsx` (lazy-import) |
| Workflows | new `CRM_ADMIN_AUDIT_GET` (GET; params `{ from?, to?, event_type?, user_id? }`; returns `{ id, event_type, payload, user_id, created_at }[]` from `sistema.eventos_sistema`) |
| RBAC | `reportes.read` |
| Skeleton | When VPS tunnel down → skeleton + "Servicio no disponible" |
| Acceptance dep | S03 (so dev doesn't crash on empty table) |
| Rollback | Feature flag off; existing `AuditoriaPanel` keeps working |

### S09 — backup-operations

| Aspect | Detail |
|--------|--------|
| Files | `src/modules/admin/backup/BackupPanel.jsx` (new, ≤150 LOC), `src/shared/layout/WorkBody.jsx` (lazy-import) |
| Workflows | new `CRM_BACKUP_STATUS` (GET; returns last backup, size, schedule) + `CRM_BACKUP_RESTORE` (POST; payload `{ backup_id, confirmation_phrase }`; requires typed confirmation) |
| RBAC | `admin.system.config` |
| Acceptance dep | S03 |
| Rollback | Restore button disabled via flag |

### S10 — RBAC cluster (P1 first chained slice)

| Aspect | Detail |
|--------|--------|
| Files | 8 admin components (modify only the top to add `useRbac` guard): `UsuariosList.jsx`, `AgendaGlobalPanel.jsx`, `GbpPanel.jsx`, `ClienteDrawer.jsx`, `LeadsPanel.jsx`, `GbpDashboardPanel.jsx`, `GbpFichasPanel.jsx`, `Backups/Settings panels new in S09`. **Total ~750 LOC.** |
| Workflows | none |
| Permissions used (no new ones) | `admin.users.manage`, `admin.system.config`, `admin.workflows.edit`, `reportes.read`, `leads.read.all`, `leads.assign`, `clientes.update` |
| Rollback | Each component's `useRbac` call is opt-in; remove the guard |

### S11 — scraper-health-panel

| Aspect | Detail |
|--------|--------|
| Files | `src/modules/admin/scraper/ScraperStatusPanel.jsx` (new, ≤150 LOC), `src/shared/layout/WorkBody.jsx` (lazy-import) |
| Workflows | new `CRM_SCRAPER_HEALTH` (GET; aggregates nano/heavy/maps; returns `{ scraper, last_run_at, last_status, last_error }[]` from `monitor-go` engine or scraper `/health` endpoint) |
| RBAC | `admin.system.config` |
| Acceptance dep | **R1**: scraper `/health` endpoint must exist before merge. If blocked, defer entire slice. |
| Rollback | Disable workflow; UI shows "Servicio no disponible" |

### S12 — reputation-feed

| Aspect | Detail |
|--------|--------|
| Files | `src/components/dashboard/zones/Zone2Content.jsx` (replace stub at lines 426–442 with live tab), `src/components/dashboard/ReputationTab.jsx` (new, ≤150 LOC) |
| Workflows | new `CRM_REPUTACION_LEAD` (GET; calls Monitor Reputación engine `:8092` via `POST /webhook/scraper/go`; returns score + last reviews + alert state for a `lead_id`) |
| Acceptance dep | S11 (so the engine status is known); **R2**: confirm `:8092` contract before production wiring |
| Rollback | Revert tab body; keep stub text |

### S13 — rescrape-trigger + lead-freshness-config

| Aspect | Detail |
|--------|--------|
| Files | `src/modules/admin/cartera/ClienteDrawer.jsx` (add "Forzar rescrape" button — note: file is in `cartera/`, not `leads/` as proposal listed), `src/modules/admin/agenda/FreshnessConfigCard.jsx` (new, ≤150 LOC; mounted inside `AgendaGlobalPanel` via composition, NOT inline edit) |
| Workflows | new `CRM_GBP_RESCRAPE` (POST; payload `{ lead_id }`) + new `CRM_LEAD_FRESHNESS_CONFIG` (GET/POST; persists to `sistema.configuracion` upsert by `key='lead_freshness_days'`) |
| DB changes | `sistema.configuracion` row insert (no schema change). |
| RBAC | `admin.system.config` for both. |
| Acceptance dep | S11. **R3**: DB function `crm.asignar_lead` read path is updated in a separate change (out of scope here). |
| Rollback | Disable workflows; UI reverts |

### S14 — scraper-config-panel

| Aspect | Detail |
|--------|--------|
| Files | `src/modules/admin/scraper/ScraperConfigPanel.jsx` (new, ≤150 LOC), `src/shared/layout/WorkBody.jsx` (lazy-import) |
| Workflows | new `CRM_SCRAPER_CONFIG_GET` (GET; returns `{ depth, frequency_minutes, localities[], categories_excluded[] }`) + `CRM_SCRAPER_CONFIG_UPDATE` (POST; payload = partial config) |
| RBAC | `admin.system.config` |
| Acceptance dep | S11. **R7**: backend must expose config update API. If blocked, defer entire slice. |
| Rollback | UI reverts to "Configuración via variables de entorno" message |

---

## 12. Risks & Mitigations (updated)

| Risk | Likelihood | Mitigation | Owner Slice |
|------|------------|-----------|-------------|
| R1 scraper `/health` missing | High | S11 documents dep; defer if blocked | S11 |
| R2 `:8092` contract unconfirmed | Med | S12 dry-run with safe-shape; production wiring after contract | S12 |
| R3 freshness DB read path | Med | S13 ships write only; DB function read path in follow-up | S13 |
| R4 callback watchdog conflict | Med | S05 includes verification step in acceptance | S05 |
| R5 operator KPI aggregation | Low | S04 ships new workflow | S04 |
| R6 dev-DB `eventos_sistema` gap | High | S03 shim + S08 graceful empty | S02/S03/S08 |
| R7 scraper config API missing | High | S14 may defer entirely | S14 |
| R8 RBAC scale | Med | S10 covers 8; future chained slices | S10 |
| **New R9** `AgendaGlobalPanel` 740 LOC | Med | S13 uses composition (FreshnessConfigCard); do not inline edit | S13 |
| **New R10** `UsuariosList` 722 LOC | Med | S10 wraps at top only; no body rewrite | S10 |
| **New R11** `useOperatorData` 204 LOC public API stability | Med | S06 keeps return shape; type-checked manually (no TS) | S06 |
| **New R12** `useN8nQuery` zero production usage | Med | First slice to adopt it (S04) sets the pattern; manual verification per slice | S04–S14 |
| **New R13** cross-PR budget exceeded | Med | PR review rejects if >800 LOC → split further | every |
| **New R14** new RBAC permission requested mid-slice | Med | Flag explicitly; defer to future change (AD-6) | every |

---

## 13. Open Questions

- [ ] Exact landing page component name holding the "Fase 3" / "Fase 9" label for S01 — needs `rg "Fase [0-9]" src/` at apply time.
- [ ] Existing `ClienteDrawer.jsx` is at `src/modules/admin/cartera/` (not `leads/` as proposal listed). Proposal file paths table needs correction at apply time.

---

## 14. Migration / Rollout

No DB migrations. Rollout = sequential merge S01→S14. Each PR independently shippable; each can be reverted without affecting earlier slices (no shared DB state beyond additive rows in `sistema.eventos_sistema` and `sistema.configuracion`, both deletable). Workflows can be deactivated individually in n8n.

---

## 15. Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | none (vitest placeholder per `openspec/config.yaml`) | n/a |
| E2E smoke | 1 per slice (14 total) — `e2e/{slice-name}.spec.js` | Playwright; CI runs all 14 |
| Manual | Visual regression for Navy Industrial style + per-zone boundary isolation in S02 | Per slice |
| Backend | Each new n8n workflow tested via `n8n-mcp-local` execute before slice merge | Per slice |

---

## 16. Hard Constraints (self-check)

- [x] Components max 150 lines: every new component above marks `≤150 LOC`.
- [x] No inline styles (CSS custom-property exception noted in AGENTS.md allowed for runtime-proportional widths; none required by these slices).
- [x] No new RBAC permissions.
- [x] Frontend never hits PostgreSQL (rule in `openspec/config.yaml` `rules.design`).
- [x] No localhost fallback.
- [x] No mock data.
- [x] Each slice ≤800 changed lines (per slice LOC budget listed above).
- [x] P3 toggles not addressed.
