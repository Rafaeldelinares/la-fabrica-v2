# Delta Spec: backup-operations (F01 Sidebar + F03 Split)

## MODIFIED Requirements

### Requirement: REQ-00X: Sidebar navigation to BackupPanel

The system MUST provide a Sistema navigation entry "Respaldos" in `Sidebar.jsx` that routes to `BACKUP` tab in `WorkBody.jsx`, guarded by RBAC permission `admin.system.config` or `reportes.read`.

(Previously: No sidebar requirement — BackupPanel was only accessible via direct URL or future navigation)

#### Scenario: Admin accesses BackupPanel via Sidebar

- GIVEN an admin user is authenticated and `Sidebar.jsx` is rendered
- WHEN the "Sistema" section is expanded and "Respaldos" is clicked
- THEN `WorkBody.jsx` routes to the `BACKUP` tab
- AND `BackupPanel` is rendered in the work area

#### Scenario: Non-admin user does not see Respaldos entry

- GIVEN a non-admin operator is authenticated
- WHEN `Sidebar.jsx` renders
- THEN the "Respaldos" entry is not visible in the Sistema section
- AND direct URL access to BACKUP tab returns access-denied

### Requirement: REQ-00Y: BackupPanel component split

The `BackupPanel` component (354 LOC) MUST be refactored into `BackupPanel.jsx` (≤150 LOC) plus helper modules `useBackupOps.js` (hook) and `backupHelpers.js` (utility functions). The public API (props, events, workflow calls) remains unchanged.

(Previously: Single monolithic `BackupPanel.jsx` at 354 LOC)

#### Scenario: BackupPanel split preserves all existing behavior

- GIVEN `BackupPanel` is refactored into component + helpers
- WHEN the refactored component renders with the same props
- THEN all existing behavior is preserved (display, actions, error handling)
- AND 14 existing E2E specs continue to pass without modification
