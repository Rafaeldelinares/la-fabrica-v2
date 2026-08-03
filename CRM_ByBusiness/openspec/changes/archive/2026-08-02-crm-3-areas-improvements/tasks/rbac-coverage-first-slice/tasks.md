# Tasks: S10 — rbac-coverage-first-slice (P1)

**Slice:** S10
**Area:** C (Administrador)
**Title:** RBAC cluster — 8 admin components with useRbac guards
**Capability:** `rbac-coverage-first-slice`
**Depends on:** none
**Delivery order:** 10 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

---

## Phase 1: usuarios Cluster

- [x] 1.1 Add `useRbac` guard to `src/modules/admin/usuarios/UsuariosList.jsx` (722 LOC). Guard at top of component: `admin.users.manage` for full access (NOTE: `usuarios.write`/`usuarios.read` not in rbac.js — using `admin.users.manage`). Files: `src/modules/admin/usuarios/UsuariosList.jsx`. Kind: frontend. Est: ~15 lines (guard only — no body rewrite). Acceptance: without permission, access-denied shown; with read permission, read-only mode. Depends on: none. ⚠️ **R10**: File is 722 LOC — wrap at top only, do NOT rewrite body.
- [x] 1.2 Add `useRbac` guard to `AgendaGlobalPanel` (740 LOC). Guard for `admin.system.config`. Files: `src/modules/admin/agenda/AgendaGlobalPanel.jsx`. Kind: frontend. Est: ~10 lines. Acceptance: guard at top; existing toggles still functional. Depends on: none. ⚠️ **R9**: File is 740 LOC — wrap at top only, do NOT inline edit.

---

## Phase 2: leads + gbp Cluster

- [x] 2.1 Add `useRbac` guard to `src/modules/admin/cartera/ClienteDrawer.jsx`. `leads.read.all` for access; `clientes.update` for write mode (NOTE: `leads.write` not in rbac.js — using `leads.read.all`/`clientes.update`). Files: `src/modules/admin/cartera/ClienteDrawer.jsx`. Kind: frontend. Est: ~15 lines. Acceptance: access-denied or read-only mode works. Depends on: none.
- [x] 2.2 Add `useRbac` guard to `src/modules/admin/gbp/GbpPanel.jsx`. `admin.system.config` (NOTE: `gbp.write`/`gbp.read` not in rbac.js — using `admin.system.config`). Files: `src/modules/admin/gbp/GbpPanel.jsx`. Kind: frontend. Est: ~15 lines. Acceptance: read-only badge shown for non-writers. Depends on: none.
- [x] 2.3 Add `useRbac` guard to `src/modules/admin/leads/LeadsPanel.jsx`. `leads.assign` (NOTE: `leads.write` not in rbac.js — using `leads.assign`). Files: `src/modules/admin/leads/LeadsPanel.jsx`. Kind: frontend. Est: ~15 lines. Acceptance: guard functional. Depends on: none.
- [x] 2.4 Add `useRbac` guard to `src/modules/admin/gbp/GbpDashboardPanel.jsx` and `src/modules/admin/gbp/GbpFichasPanel.jsx`. Files: `src/modules/admin/gbp/GbpDashboardPanel.jsx`, `src/modules/admin/gbp/GbpFichasPanel.jsx`. Kind: frontend. Est: ~20 lines. Acceptance: guards functional. Depends on: none.

---

## Phase 3: S08/S09 panels

- [x] 3.1 Verify `AdminAuditPanel.jsx` (S08) has `reportes.read` guard. Files: `src/modules/admin/auditoria/AdminAuditPanel.jsx`. Kind: frontend. Est: ~5 lines check. Acceptance: guard present. Depends on: S08. Status: VERIFIED — guard at lines 39-49.
- [x] 3.2 Verify `BackupPanel.jsx` (S09) has `admin.system.config` guard. Files: `src/modules/admin/backup/BackupPanel.jsx`. Kind: frontend. Est: ~5 lines check. Acceptance: guard present. Depends on: S09. Status: VERIFIED — guard at line 197.

---

## Phase 4: E2E Smoke

- [x] 4.1 Create `e2e/s10-rbac-coverage.spec.js`. Test: authorized admin accesses all 8 components; unauthorized user sees access-denied. Files: `e2e/s10-rbac-coverage.spec.js` (new), `playwright.config.js` (updated). Kind: test. Est: ~100 lines. Acceptance: spec passes; guards trigger correctly. Depends on: 1.1, 2.1, 2.2, 2.3, 2.4.

---

## Critical Risk

- ⚠️ **R9** (HIGH): `AgendaGlobalPanel` 740 LOC — wrap at top only. Do NOT inline edit the panel body.
- ⚠️ **R10** (HIGH): `UsuariosList` 722 LOC — wrap at top only. Do NOT rewrite the component body.
- ⚠️ **R8** (MED): Full RBAC migration across 37 components requires future chained slices. S10 covers 8; remaining in future changes.

---

## Commit Plan

```
feat(admin): add useRbac guard to UsuariosList
feat(admin): add useRbac guard to AgendaGlobalPanel
feat(admin): add useRbac guard to ClienteDrawer, LeadsPanel
feat(admin): add useRbac guard to GbpPanel, GbpDashboardPanel, GbpFichasPanel
```

**Commit 1** — `src/modules/admin/usuarios/UsuariosList.jsx`, `src/modules/admin/agenda/AgendaGlobalPanel.jsx` (2 files).
**Commit 2** — `src/modules/admin/leads/ClienteDrawer.jsx`, `src/modules/admin/leads/LeadsPanel.jsx` (2 files).
**Commit 3** — `src/modules/admin/gbp/GbpPanel.jsx`, `src/modules/admin/gbp/GbpDashboardPanel.jsx`, `src/modules/admin/gbp/GbpFichasPanel.jsx` (3 files).

---

## Verification Plan

- `npm run test:e2e` — `s10-rbac-coverage.spec.js` passes.
- Manual: verify read-only mode hides create/edit/delete buttons in UsuariosList.
- Manual: verify AgendaGlobalPanel toggles hidden for users without specific permissions.

---

## Rollback Plan

Remove `useRbac` guard from each component individually (each is opt-in). No shared state. Boundary: this slice only.
