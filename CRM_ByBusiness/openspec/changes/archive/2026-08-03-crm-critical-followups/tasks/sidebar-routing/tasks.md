# Tasks: F01 — Sidebar Routing

**Slice:** F01
**Area:** C (Administrador)
**Title:** Add Sistema entries for backup, audit, and scraper admin panels
**Capability:** `backup-operations`, `admin-audit-trail`, `scraper-health-panel`, `scraper-config-panel`
**Depends on:** none
**Delivery order:** 1 of 3

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: Sidebar — Add Sistema Entries

- [x] 1.1 Add 4 new Sistema section entries to `Sidebar.jsx` after existing `Auditoría` item (line 66): `Monitor Scrapers` (Activity icon, `MONITOR` id, `admin.system.config`), `Respaldos` (Database icon, `BACKUP` id, `admin.system.config`), `Auditoría Nueva` (ShieldCheck icon, `AUDIT_NEW` id, `reportes.read`), `Configuración Scrapers` (Settings icon, `SCRAPER_CONFIG` id, `admin.system.config`). Import `Activity` and `Settings` from lucide-react (line 3). File: `src/shared/layout/Sidebar.jsx` (modify). Kind: frontend. Est: ~20 lines. Acceptance: 4 new entries visible to admin role; hidden from operador/supervisor. Depends on: none.

---

## Phase 2: WorkBody — Add Routes

- [x] 2.1 Add 3 conditional renders in `WorkBody.jsx` after existing `AUDITORIA` route (line 81): `{activeTab === 'BACKUP' && <BackupPanel />}`, `{activeTab === 'AUDIT_NEW' && <AdminAuditPanel />}`, `{activeTab === 'SCRAPER_CONFIG' && <ScraperConfigPanel />}`. Import `AdminAuditPanel` from `../../modules/admin/auditoria/AdminAuditPanel`. Verify `BackupPanel` and `ScraperConfigPanel` are already lazy-imported (lines 29, 30). File: `src/shared/layout/WorkBody.jsx` (modify). Kind: frontend. Est: ~15 lines. Acceptance: 3 new panels render when their tab is selected; existing `AUDITORIA` route unaffected. Depends on: 1.1.

---

## Phase 3: E2E Smoke

- [x] 3.1 Create `e2e/f01-sidebar-routing.spec.js`. Test: admin logs in, clicks each of the 4 new Sistema entries (Monitor Scrapers, Respaldos, Auditoría Nueva, Configuración Scrapers), verifies correct panel renders or RBAC deny message. File: `e2e/f01-sidebar-routing.spec.js` (new). Kind: test. Est: ~40 lines. Acceptance: spec passes. Depends on: 1.1, 2.1.

---

## Critical Risks

- ⚠️ **R1**: `AdminAuditPanel` import — verify path `../../modules/admin/auditoria/AdminAuditPanel` exists in `WorkBody.jsx`; legacy `AuditoriaPanel` (`AUDITORIA`) stays untouched to preserve existing behavior.

---

## Commit Plan

```
feat(admin): add sidebar entries for backup, audit, and scraper panels
```

**Commit 1** — `src/shared/layout/Sidebar.jsx`, `src/shared/layout/WorkBody.jsx`, `e2e/f01-sidebar-routing.spec.js`

---

## Verification Plan

- `npm run test:e2e -- f01-sidebar-routing.spec.js` passes.
- Manual: log in as admin, verify all 4 new Sistema entries visible; log in as operador, verify entries hidden.

---

## Rollback Plan

Revert commit. `Sidebar.jsx` and `WorkBody.jsx` restored to pre-F01 state. E2E spec removed. No other slices affected.
