# Tasks: S09 — backup-operations

**Slice:** S09
**Area:** C (Administrador)
**Title:** Backup management panel with status, restore, schedule display
**Capability:** `backup-operations`
**Depends on:** S03 (dev eventos shim)
**Delivery order:** 9 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

---

## Phase 1: BackupPanel Component

- [x] 1.1 Create `src/modules/admin/backup/BackupPanel.jsx` (~130 LOC). Shows: last backup timestamp, size, status badge ("Exitoso" / "Fallido" / "En progreso"), schedule display (read-only), "Respaldar ahora" button. Stale backup (>48h) shows warning badge. Uses `useN8nQuery` + `useN8nMutation`. Skeleton loading (no spinner). Files: `src/modules/admin/backup/BackupPanel.jsx` (new). Kind: frontend. Est: ~130 lines. Acceptance: all status fields render; stale indicator shows after 48h. Depends on: S03.
- [x] 1.2 Implement manual backup: confirmation dialog → `useN8nMutation('crm-backup-restore', { action: 'backup' })`. Success updates timestamp. Files: `src/modules/admin/backup/BackupPanel.jsx` (same file). Kind: frontend. Est: ~30 lines. Acceptance: manual backup triggers; status updates on success. Depends on: 1.1, 2.1.
- [x] 1.3 Implement restore: typed confirmation (admin types backup date), warning dialog → `useN8nMutation('crm-backup-restore', { action: 'restore', backup_id })`. Progress indicator during restore. RBAC guard: `admin.system.config`. Files: `src/modules/admin/backup/BackupPanel.jsx` (same file). Kind: frontend. Est: ~50 lines. Acceptance: restore requires typed confirmation; admin role enforced. Depends on: 1.1, 2.1.

---

## Phase 2: Workflows

- [x] 2.1 Create `CRM_BACKUP_STATUS` n8n workflow (new). Returns `{ backups: [{ id, timestamp, size_mb, status }], schedule: { frequency, next_run } }`. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~120 lines. Acceptance: returns correct schema; empty list handled. Depends on: none.
- [x] 2.2 Create `CRM_BACKUP_RESTORE` n8n workflow (new). Actions: `backup` (triggers new backup) and `restore` (restores from backup_id). Requires typed confirmation phrase. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~150 lines. Acceptance: both actions succeed; restore requires confirmation. Depends on: none.

---

## Phase 3: E2E Smoke

- [x] 3.1 Create `e2e/s09-backup-operations.spec.js`. Test: admin views backup panel, verifies status displayed. Files: `e2e/s09-backup-operations.spec.js` (new). Kind: test. Est: ~50 lines. Acceptance: spec passes. Depends on: 1.1, 2.1.

---

## Commit Plan

```
feat(admin): create BackupPanel with status, manual backup, restore
feat(workflow): create CRM_BACKUP_STATUS for backup metadata
feat(workflow): create CRM_BACKUP_RESTORE for backup and restore actions
```

**Commit 1** — `src/modules/admin/backup/BackupPanel.jsx` (1 file).
**Commit 2** — workflows (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s09-backup-operations.spec.js` passes.
- Manual: verify restore button disabled for non-admin role.
- Manual: verify stale backup (>48h) shows warning badge.

---

## Rollback Plan

Revert commits. Restore button disabled via feature flag. Disable `CRM_BACKUP_STATUS` and `CRM_BACKUP_RESTORE` workflows. Boundary: this slice only.
