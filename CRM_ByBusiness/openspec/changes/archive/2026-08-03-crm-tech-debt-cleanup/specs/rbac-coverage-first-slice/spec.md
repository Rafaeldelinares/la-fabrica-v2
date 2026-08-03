# Delta: rbac-coverage-first-slice — crm-tech-debt-cleanup (T02)

## Context

This delta adds 6 missing permissions to `ALL_PERMISSIONS` in `src/shared/auth/rbac.js`, completing the permission definitions required by the scenarios already documented in the base spec. No existing scenarios or requirements are modified.

## MODIFIED Requirements

No existing requirements are modified. All 6 permissions were referenced in scenarios of the base spec but were not defined in `ALL_PERMISSIONS`.

## ADDED Requirements

### Requirement: ALL_PERMISSIONS includes 6 new permissions

The system MUST define these 6 permissions in `ALL_PERMISSIONS` within `src/shared/auth/rbac.js`:

- `auditoria.read` — required by `AdminAuditPanel` (auditing)
- `backup.admin` — required by `BackupPanel` (destructive backup operations)
- `usuarios.write` — required by `UsuariosList` (user management write)
- `leads.write` — required by `LeadsPanel` / `ClienteDrawer` (lead management write)
- `gbp.write` — required by `GbpPanel` (GBP management write)
- `agenda.snapshots` — required by `AgendaGlobalPanel` (GBP snapshot toggle)

#### Scenario: Admin role retains all permissions including new ones

- GIVEN `admin` role is assigned all permissions from `ALL_PERMISSIONS` (line 80)
- WHEN new permissions are added to `ALL_PERMISSIONS`
- THEN `admin` automatically includes all new permissions
- AND no role assignment changes are required

#### Scenario: Non-admin roles retain existing permissions

- GIVEN a non-admin role has a fixed set of permissions before this change
- WHEN 6 new permissions are added to `ALL_PERMISSIONS`
- THEN the non-admin role's assigned permissions are unchanged
- AND no new permissions are implicitly granted

#### Scenario: UsuariosList requires usuarios.write permission

- GIVEN a user without `usuarios.write` permission navigates to `UsuariosList`
- WHEN the component mounts
- THEN an access-denied message is shown
- AND no user management operations are available

#### Scenario: LeadsPanel requires leads.write permission

- GIVEN a user without `leads.write` permission navigates to `LeadsPanel`
- WHEN the component mounts
- THEN an access-denied message is shown
- AND no lead editing operations are available

#### Scenario: GbpPanel requires gbp.write permission

- GIVEN a user without `gbp.write` permission navigates to `GbpPanel`
- WHEN the component mounts
- THEN an access-denied message is shown
- AND no GBP editing operations are available

#### Scenario: AgendaGlobalPanel gbp_snapshot toggle requires agenda.snapshots permission

- GIVEN a user without `agenda.snapshots` permission views `AgendaGlobalPanel`
- WHEN the `gbp_snapshot` toggle is rendered
- THEN the toggle is hidden or disabled
- AND the user cannot interact with it

#### Scenario: AdminAuditPanel requires auditoria.read permission

- GIVEN a user without `auditoria.read` permission navigates to `AdminAuditPanel`
- WHEN the component mounts
- THEN an access-denied message is shown
- AND no audit data is fetched

#### Scenario: BackupPanel destructive operations require backup.admin permission

- GIVEN a user without `backup.admin` permission accesses `BackupPanel`
- WHEN destructive backup operations are attempted
- THEN the operations are blocked
- AND an access-denied message is shown

## Unchanged Requirements

All requirements from the base spec remain in effect and are not modified by this delta.
