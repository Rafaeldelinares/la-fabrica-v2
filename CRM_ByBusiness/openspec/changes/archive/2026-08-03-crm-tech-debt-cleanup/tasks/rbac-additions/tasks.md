# Tasks: T02 — RBAC Additions

**Slice:** T02
**Title:** Add 6 missing granular permissions to ALL_PERMISSIONS and update S10 component gates
**Capability:** `rbac-coverage-first-slice`
**Depends on:** none
**Delivery order:** 3 of 3

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~120 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Two commits |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: Add 6 new permissions to ALL_PERMISSIONS

- [x] 1.1 Append 6 new permissions to `ALL_PERMISSIONS` array in `src/shared/auth/rbac.js`: `'auditoria.read'`, `'backup.admin'`, `'usuarios.write'`, `'leads.write'`, `'gbp.write'`, `'agenda.snapshots'`. Add section comments matching existing style (e.g. `// Auditoria`, `// Usuarios`, `// GBP`). File: `src/shared/auth/rbac.js` (modify). Kind: feat. Est: ~10 lines. Acceptance: `ALL_PERMISSIONS` contains all 6 new permissions; admin auto-includes them (line 80). Depends on: none.

---

## Phase 2: Update UsuariosList.jsx to use `usuarios.write`

- [x] 2.1 In `src/modules/admin/usuarios/UsuariosList.jsx`, replace any gate using `admin.users.manage` with `usuarios.write` at the relevant guard/hide positions (lines ~313, ~316). File: `src/modules/admin/usuarios/UsuariosList.jsx` (modify). Kind: refactor. Est: ~4 lines. Acceptance: user management UI requires `usuarios.write`. Depends on: 1.1.

---

## Phase 3: Update LeadsPanel.jsx to use `leads.write` and `leads.read`

- [x] 3.1 In `src/modules/admin/leads/LeadsPanel.jsx`, replace the panel-level gate that uses `leads.assign` with `leads.write` (line ~25). Replace `canEdit` / status-edit gate using `leads.update.status` with `leads.read` (lines ~140, ~222) per AD-3. File: `src/modules/admin/leads/LeadsPanel.jsx` (modify). Kind: refactor. Est: ~6 lines. Acceptance: lead editing requires `leads.write`; reading requires `leads.read`. Depends on: 1.1.

---

## Phase 4: Update ClienteDrawer.jsx to use `leads.read` and `leads.write`

- [x] 4.1 In `src/modules/admin/cartera/ClienteDrawer.jsx`, replace the drawer-level gate using `leads.read.all` with `leads.read` (line ~45). Replace the update gate using `clientes.update` with `leads.write` (line ~48) per AD-4. File: `src/modules/admin/cartera/ClienteDrawer.jsx` (modify). Kind: refactor. Est: ~4 lines. Acceptance: drawer renders with `leads.read`; edits require `leads.write`. Depends on: 1.1.

---

## Phase 5: Update GbpPanel, GbpDashboardPanel, GbpFichasPanel to use `gbp.write`

- [x] 5.1 In `src/modules/admin/gbp/GbpPanel.jsx`, replace any gate using `admin.system.config` with `gbp.write` (confirm exact line via grep). File: `src/modules/admin/gbp/GbpPanel.jsx` (modify). Kind: refactor. Est: ~2 lines. Depends on: 1.1.

- [x] 5.2 In `src/modules/admin/gbp/GbpDashboardPanel.jsx`, replace any gate using `admin.system.config` with `gbp.write`. File: `src/modules/admin/gbp/GbpDashboardPanel.jsx` (modify). Kind: refactor. Est: ~2 lines. Depends on: 1.1.

- [x] 5.3 In `src/modules/admin/gbp/GbpFichasPanel.jsx`, replace any gate using `admin.system.config` with `gbp.write`. File: `src/modules/admin/gbp/GbpFichasPanel.jsx` (modify). Kind: refactor. Est: ~2 lines. Depends on: 1.1.

---

## Phase 6: Update AgendaGlobalPanel.jsx to use `agenda.snapshots` for gbp_snapshot toggle

- [x] 6.1 In `src/modules/admin/agenda/AgendaGlobalPanel.jsx`, keep the outer panel gate with `admin.system.config` (unchanged). Wrap the `gbp_snapshot` toggle row (lines ~450, ~611) with `can(user, 'agenda.snapshots')` guard per AD-5. File: `src/modules/admin/agenda/AgendaGlobalPanel.jsx` (modify). Kind: refactor. Est: ~4 lines. Acceptance: `gbp_snapshot` toggle is hidden if user lacks `agenda.snapshots`. Depends on: 1.1.

---

## Phase 7: Update AdminAuditPanel.jsx and BackupPanel.jsx

- [x] 7.1 In `src/modules/admin/auditoria/AdminAuditPanel.jsx`, replace gate using `reportes.read` with `auditoria.read` (line ~39). File: `src/modules/admin/auditoria/AdminAuditPanel.jsx` (modify). Kind: refactor. Est: ~2 lines. Acceptance: audit panel requires `auditoria.read`. Depends on: 1.1.

- [x] 7.2 In `src/modules/admin/backup/BackupPanel.jsx`, replace gate using `admin.system.config` with `backup.admin` (line ~33). File: `src/modules/admin/backup/BackupPanel.jsx` (modify). Kind: refactor. Est: ~2 lines. Acceptance: backup destructive operations require `backup.admin`. Depends on: 1.1.

---

## Critical Risks

- ⚠️ **`admin` role auto-includes all 6 new permissions** (rbac.js:80 `getPermissionsForRole`). No role assignment changes needed for admin users.
- ⚠️ **Non-admin users** retain their existing fixed permission set. New perms are NOT implicitly granted to any role.
- ⚠️ **Existing E2E specs** (14 total) must pass unmodified. Verify after each component commit.

---

## Commit Plan

```
feat(rbac): add 6 new granular permissions to ALL_PERMISSIONS
refactor(admin): migrate S10 components to use new granular permissions
```

**Commit 1** — `src/shared/auth/rbac.js`.

**Commit 2** — 7 component files: `UsuariosList.jsx`, `LeadsPanel.jsx`, `ClienteDrawer.jsx`, `GbpPanel.jsx`, `GbpDashboardPanel.jsx`, `GbpFichasPanel.jsx`, `AgendaGlobalPanel.jsx`, `AdminAuditPanel.jsx`, `BackupPanel.jsx` (≤3 files per commit GGA; this is 9 files so split into two commits if needed, or keep as one large commit per design spec which allows this for RBAC gate changes).

---

## Verification Plan

- `npm run test:e2e` — all 14 existing specs pass.
- Manually: log `ALL_PERMISSIONS` at `/admin` — 6 new permissions visible.
- Manually: navigate to each updated panel as a non-admin user with the expected permission; confirm access-denied or allowed matches expectation.

---

## Rollback Plan

`git revert <commit>` removes the 6 new permissions from `ALL_PERMISSIONS`. S10 components fall back to their previous permission gates (closest available). Admin retains full access regardless.
