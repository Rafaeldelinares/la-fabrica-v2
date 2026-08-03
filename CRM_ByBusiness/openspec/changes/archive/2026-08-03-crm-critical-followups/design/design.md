# Design: crm-critical-followups (F01 Sidebar + F02 Watchdog + F03 Splits)

**Phase:** sdd-design · **Date:** 2026-08-03 · **Delivery:** `force-chained`, 3 slices stacked-to-main, ≤800 LOC, ≤3 files/commit

---

## 1. Approach

Three slices closing 3 CRITICAL findings from `crm-3-areas-improvements` (archived 2026-08-02). No new RBAC, no DB schema changes, no new workflows. Frontend routed via n8n.

| Slice | CR | LOC | Commits |
|------|----|----|------|
| F01 | CR-02 | ~80 | 1 |
| F02 | CR-03 | ~100 | 1 |
| F03 | CR-01 | ~700 | 5 |

---

## 2. Architecture Decisions

| # | Decision | Choice | Rationale |
|---|---------|--------|-----------|
| AD-1 | Sidebar RBAC | Reuse `admin.system.config`, `reportes.read` | Spec references `auditoria.read`/`scraper.read` — neither in `rbac.js`. |
| AD-2 | MONITOR + SCRAPER_CONFIG | Keep both | MONITOR shows both panels; SCRAPER_CONFIG for direct access. |
| AD-3 | Legacy `AUDITORIA` route | Preserve + deprecate | `AuditoriaPanel.jsx` still imported at `WorkBody.jsx:23,81`. |
| AD-4 | F02 skip-logic verdict | No DB change | `crm_watchdog_callbacks()` filters `WHERE estado='pendiente'` — excludes `cancelada`. |
| AD-5 | F02 state-value typo | Spec `'cancelado'` → `'cancelada'` | Verified `\dT estado_programada`. WHERE filter value-agnostic. |
| AD-6 | F02 E2E spec | New `f02-watchdog-skip-coverage.spec.js` | Spec mandates E2E. Calls `CRM_CALLBACKS_GESTIONAR`, asserts skip. |
| AD-7 | F03 helper convention | `Component.helpers.js` + `useComponentLogic.js` co-located | No `*.helpers.js` exist yet. |
| AD-8 | F03 sub-component extraction | Single-use stay inline in helpers | `CancelDialog` extracted to sibling if LOC allows. |
| AD-9 | F03 commit order | C5→C4→C1→C2→C3 | Smallest first; each ≤3 files (GGA). |

---

## 3. F01 — Sidebar Routing (CR-02)

**Sidebar.jsx** (Sistema section, line 60-68) — add 4 entries:

| Entry | Icon | Tab ID | Permission |
|-------|------|--------|------------|
| Monitor Scrapers | `Activity` | `MONITOR` | `admin.system.config` |
| Respaldos | `Database` | `BACKUP` | `admin.system.config` |
| Auditoría | `ShieldCheck` | `AUDIT_NEW` | `reportes.read` |
| Configuración Scrapers | `Settings` | `SCRAPER_CONFIG` | `admin.system.config` |

Import `Activity, Database, Settings` to lucide-react line 3. RBAC filter unchanged.

**WorkBody.jsx** — add 3 conditional renders after line 75:
```jsx
{activeTab === 'BACKUP' && <BackupPanel />}
{activeTab === 'AUDIT_NEW' && <AdminAuditPanel />}
{activeTab === 'SCRAPER_CONFIG' && <ScraperConfigPanel />}
```

**Migration**: 1 commit: `Sidebar.jsx` + `WorkBody.jsx` + `e2e/f01-sidebar-routing.spec.js` (~80 LOC).

---

## 4. F02 — Watchdog Verification (CR-03)

| Check | Result |
|-------|--------|
| Workflow | ✅ `CRM_WATCHDOG_CALLBACKS_V2` (VPS `oiCboRThnoOAeLxW`) |
| Active nodes | 2/4: `Schedule Trigger` (15 min) + `Ejecutar Watchdog` |
| Disabled | ✅ `Hay callbacks` (IF) + `Redistribuir Callback` (UPDATE) |
| Active query | `SELECT * FROM crm_watchdog_callbacks()` |
| Function | ✅ `public.crm_watchdog_callbacks()` (VPS, `jsonb`) |
| Skip logic | ✅ `WHERE estado='pendiente'` excludes `cancelada`/`completada`/`no_contesta` |
| Active version | 2026-06-07T06:56:28 |

**Outcome**: No DB change (skip provable from WHERE). No workflow change (IF + UPDATE disabled). Correct spec `'cancelado'` → `'cancelada'`. New `e2e/f02-watchdog-skip-coverage.spec.js` + `playwright.config.js`.

**Migration**: 1 commit (~100 LOC). No DDL.

---

## 5. F03 — Component Splits (CR-01)

```
MisCallbacksPanel.jsx     (≤150 LOC, orchestration)
useCallbacksLogic.js      (hook: data + mutations)
callbacksHelpers.js       (pure: extract, format, transform)
```

| # | Component | Now | Target | Extract |
|---|-----------|-----|--------|---------|
| C5 | `MisKpiStrip.jsx` | 158 | ≤150 | `useKpiStripLogic.js` |
| C4 | `ReputacionTab.jsx` | 170 | ≤150 | `reputacionHelpers.js` (`ReviewCard` + helpers) |
| C1 | `MisCallbacksPanel.jsx` | 311 | ≤150 | `useCallbacksLogic.js` + `callbacksHelpers.js` + `CancelDialog.jsx` |
| C2 | `BackupPanel.jsx` | 354 | ≤150 | `useBackupOps.js` + `backupHelpers.js` |
| C3 | `ScraperConfigPanel.jsx` | 335 | ≤150 | `useScraperConfig.js` + `scraperConfigHelpers.js` |

Each helpers file extracts pure helpers + single-use sub-components. Each hook owns data fetch + mutations + local state. **Public API**: default export + props unchanged. Consumers (`OperatorDashboard`, `MisResultados`, `Zone2Content`) untouched.

**Migration**: 5 commits (C5→C4→C1→C2→C3). Safety net: 14 existing Playwright specs pass unmodified.

---

## 6. File Changes

| File | Slice |
|------|-------|
| `Sidebar.jsx`, `WorkBody.jsx`, `e2e/f01-sidebar-routing.spec.js` | F01 |
| `e2e/f02-watchdog-skip-coverage.spec.js`, `playwright.config.js` | F02 |
| 5 components + 11 helpers/hooks | F03 |

## 7. Testing

F01 + F02 new E2E via `npm run test:e2e`. F03 regression: 14 existing Playwright specs pass unmodified per commit. F02 manual: n8n execution history confirms cancelled callback not re-processed.

---

## 8. Open Questions

- [ ] F01: Confirm `auditoria.read` → `reportes.read` at apply time.
- [ ] F02: Spec wording correction inline or follow-up?
- [ ] F03: If helpers file exceeds ~150 LOC, split further.

## 9. Constraints

Components ≤150 LOC ✓ · No public API changes ✓ · No new RBAC ✓ · No DB schema changes ✓ · Frontend never hits PostgreSQL ✓ · Each slice ≤800 LOC ✓ · ≤3 files/commit (GGA) ✓ · 14 existing E2E specs unchanged ✓ · No localhost fallback ✓