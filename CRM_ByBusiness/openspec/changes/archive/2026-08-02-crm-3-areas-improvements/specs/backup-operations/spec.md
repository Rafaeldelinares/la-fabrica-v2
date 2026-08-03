# Spec: backup-operations (S09)

## Purpose

Provide administrators with a dedicated `BackupPanel` showing backup status, last backup timestamp, and backup size, plus restore and schedule management, via new `CRM_BACKUP_STATUS` and `CRM_BACKUP_RESTORE` workflows.

## Affected Components

- `src/modules/admin/backup/BackupPanel.jsx` (new)
- `src/modules/admin/backup/` (backup panel directory)
- Workflow: `CRM_BACKUP_STATUS` (new — returns backup metadata)
- Workflow: `CRM_BACKUP_RESTORE` (new — triggers restore operation)

## Requirements

### REQ-001: BackupPanel displays current backup status

The system MUST show the last backup timestamp, size, and status in `BackupPanel`.

#### Scenario: Admin views backup panel with available backup

- GIVEN an admin navigates to `BackupPanel`
- WHEN the panel loads
- THEN it displays: last backup timestamp, estimated size, and status badge ("Exitoso", "Fallido", "En progreso")
- AND a "Respaldar ahora" manual trigger button is shown

#### Scenario: No backup exists yet

- GIVEN no backup has been performed
- WHEN `BackupPanel` loads
- THEN it displays "Sin respaldos disponibles"
- AND the restore section is disabled

#### Scenario: Backup status is stale

- GIVEN the last backup is older than 48 hours
- WHEN `BackupPanel` loads
- THEN a warning badge is shown: "Último respaldo hace más de 48h"

### REQ-002: Admin can trigger a manual backup

The system MUST allow admins to trigger an immediate backup via `CRM_BACKUP_RESTORE` with action `backup`.

#### Scenario: Admin triggers manual backup

- GIVEN an admin is on `BackupPanel`
- WHEN they click "Respaldar ahora"
- THEN a confirmation dialog appears
- AND confirming calls `CRM_BACKUP_RESTORE` with `action: 'backup'`
- AND a loading state is shown
- AND on success the panel updates with the new backup timestamp

#### Scenario: Manual backup fails

- GIVEN the admin submitted a manual backup
- WHEN `CRM_BACKUP_RESTORE` returns an error
- THEN an error notification is shown
- AND the previous backup status remains displayed

### REQ-003: Admin can restore from a backup

The system MUST allow admins to restore from a selected backup via `CRM_BACKUP_RESTORE` with action `restore`.

#### Scenario: Admin initiates restore

- GIVEN an admin is on `BackupPanel`
- WHEN they click "Restaurar" on a specific backup
- THEN a typed confirmation is required (admin must type the backup date to confirm)
- AND a warning is shown about potential data loss
- AND confirming calls `CRM_BACKUP_RESTORE` with `action: 'restore'` and `backup_id`
- AND a progress indicator is shown during restore

#### Scenario: Restore requires admin role

- GIVEN a non-admin user attempts to access the restore function
- WHEN they try to call `CRM_BACKUP_RESTORE`
- THEN the request returns 403 Forbidden
- AND an error notification is shown: "Permiso denegado"

#### Scenario: Restore fails

- GIVEN the admin submitted a restore request
- WHEN `CRM_BACKUP_RESTORE` returns an error
- THEN an error notification explains the failure
- AND the system remains in a consistent state

### REQ-004: Backup schedule visibility

The system MUST show the current backup schedule (e.g., daily at 02:00) in `BackupPanel`.

#### Scenario: Schedule is displayed

- GIVEN an admin opens `BackupPanel`
- WHEN the schedule information is available
- THEN the panel shows: schedule frequency, next scheduled backup time
- AND the schedule is read-only in this slice (S09 scope — no schedule editing)

### REQ-005: CRM_BACKUP_STATUS and CRM_BACKUP_RESTORE workflow contracts

`CRM_BACKUP_STATUS` MUST return `{ backups: Array<{ id, timestamp, size_mb, status }>, schedule: { frequency, next_run } }`.

`CRM_BACKUP_RESTORE` MUST accept `{ action: 'backup' | 'restore', backup_id?: string }` and return `{ success: boolean, backup?: object, error?: string }`.

#### Scenario: CRM_BACKUP_STATUS returns backup list

- GIVEN `CRM_BACKUP_STATUS` is called
- WHEN it queries the backup system
- THEN it returns `{ backups: [...], schedule: {...} }`

#### Scenario: CRM_BACKUP_RESTORE backup action succeeds

- GIVEN `CRM_BACKUP_RESTORE` is called with `action: 'backup'`
- WHEN the backup is triggered
- THEN it returns `{ success: true, backup: { id, timestamp, size_mb, status: 'in_progress' } }`

#### Scenario: CRM_BACKUP_RESTORE restore action requires confirmation

- GIVEN `CRM_BACKUP_RESTORE` is called with `action: 'restore'` and `backup_id`
- WHEN the backup ID is valid
- THEN the restore process begins
- AND it returns `{ success: true }`

## Out of Scope

- Editing backup schedule (future enhancement)
- Backup encryption settings
- Cross-region backup replication
- P3 toggle modifications

## Dependencies

- S09 depends on S03 (dev eventos shim — backup panel must handle missing table gracefully in dev)

## Acceptance Criteria

- [ ] `BackupPanel` created in `src/modules/admin/backup/`
- [ ] Panel displays last backup timestamp, size, and status
- [ ] "Respaldar ahora" button triggers manual backup
- [ ] Restore requires typed confirmation
- [ ] Restore requires admin role (RBAC)
- [ ] Stale backup (>48h) shows warning badge
- [ ] Schedule information is displayed (read-only)
- [ ] `CRM_BACKUP_STATUS` and `CRM_BACKUP_RESTORE` return correct schemas
- [ ] No `console.log`, no inline styles, no spinners
