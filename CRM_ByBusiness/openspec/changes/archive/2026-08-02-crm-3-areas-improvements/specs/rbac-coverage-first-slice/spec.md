# Spec: rbac-coverage-first-slice (S10)

## Purpose

Apply `useRbac` to 8 identified admin components that currently have no RBAC protection, covering user management, lead management, GBP management, and agenda management. This is the first chained RBAC slice (P1/R8 from the risk matrix).

## Affected Components

The following 8 components MUST be wrapped with `useRbac` guards:

- `src/modules/admin/usuarios/UsuariosList.jsx`
- `src/modules/admin/leads/ClienteDrawer.jsx`
- `src/modules/admin/gbp/GbpPanel.jsx`
- `src/modules/admin/agenda/AgendaGlobalPanel.jsx`
- `src/modules/admin/backup/BackupPanel.jsx` (S09 — will have RBAC added)
- `src/modules/admin/auditoria/AdminAuditPanel.jsx` (S08 — RBAC already noted in that spec)
- Additional admin components identified in the proposal slice plan

## Requirements

### REQ-001: useRbac guard applied to UsuariosList

The `UsuariosList` component MUST be protected with the appropriate `useRbac` permission check.

#### Scenario: Admin with usuarios.write accesses UsuariosList

- GIVEN a user with `usuarios.write` permission navigates to `UsuariosList`
- WHEN the component mounts
- THEN the full user management UI is displayed
- AND the component can perform create/edit/delete operations

#### Scenario: User without usuarios.write accesses UsuariosList

- GIVEN a user without `usuarios.write` permission navigates to `UsuariosList`
- WHEN the component mounts
- THEN an access-denied message is shown
- AND no user data is fetched

#### Scenario: Read-only user accesses UsuariosList

- GIVEN a user with `usuarios.read` but not `usuarios.write` accesses `UsuariosList`
- WHEN the component mounts
- THEN the user list is displayed in read-only mode
- AND create/edit/delete buttons are hidden or disabled

### REQ-002: useRbac guard applied to ClienteDrawer

The `ClienteDrawer` component MUST be protected with lead-specific RBAC permissions.

#### Scenario: User with leads.write accesses ClienteDrawer

- GIVEN a user with `leads.write` permission opens `ClienteDrawer`
- WHEN the drawer renders
- THEN lead editing capabilities are available
- AND all form fields are editable

#### Scenario: User without leads.write accesses ClienteDrawer

- GIVEN a user without `leads.write` permission opens `ClienteDrawer`
- WHEN the drawer renders
- THEN lead data is displayed in read-only mode
- AND editing controls are hidden

### REQ-003: useRbac guard applied to GbpPanel

The `GbpPanel` component MUST be protected with GBP-specific RBAC permissions.

#### Scenario: User with gbp.write accesses GbpPanel

- GIVEN a user with `gbp.write` permission accesses `GbpPanel`
- WHEN the component mounts
- THEN GBP editing capabilities are available

#### Scenario: Read-only access to GbpPanel

- GIVEN a user with `gbp.read` but not `gbp.write` accesses `GbpPanel`
- WHEN the component mounts
- THEN GBP data is displayed in read-only mode
- AND write controls are hidden

### REQ-004: useRbac guard applied to AgendaGlobalPanel

The `AgendaGlobalPanel` MUST use `useRbac` for its 12 toggles, with each toggle requiring appropriate permissions.

#### Scenario: Toggle requires specific permission

- GIVEN a user with `agenda.snapshots` permission views `AgendaGlobalPanel`
- WHEN the `gbp_snapshot` toggle is rendered
- THEN the toggle is enabled
- AND the user can interact with it

#### Scenario: Toggle hidden from unauthorized user

- GIVEN a user without `agenda.snapshots` permission views `AgendaGlobalPanel`
- WHEN the `gbp_snapshot` toggle is rendered
- THEN the toggle is hidden or disabled
- AND the user cannot interact with it

### REQ-005: useRbac applied to BackupPanel and AdminAuditPanel

The RBAC guards for `BackupPanel` (S09) and `AdminAuditPanel` (S08) MUST be verified to be consistent with this slice.

#### Scenario: BackupPanel has backup.admin permission guard

- GIVEN a user with `backup.admin` permission accesses `BackupPanel`
- WHEN the component mounts
- THEN the full backup panel is displayed

#### Scenario: AdminAuditPanel has auditoria.read guard

- GIVEN a user with `auditoria.read` permission accesses `AdminAuditPanel`
- WHEN the component mounts
- THEN the audit trail is displayed

### REQ-006: useRbac is opt-in and additive

Adding `useRbac` to a component MUST NOT break functionality for users who already have access. Existing RBAC-protected components remain unchanged.

#### Scenario: Component with existing RBAC is not affected

- GIVEN `AuditoriaPanel` already has `reportes.read` RBAC guard
- WHEN S10 is applied
- THEN the existing guard remains in place
- AND no duplicate guards are added

#### Scenario: RBAC is additive

- GIVEN a component did not have RBAC before
- WHEN `useRbac` is applied in S10
- THEN the guard is added
- AND existing component logic remains unchanged

## Out of Scope

- New RBAC permissions not defined in this change
- RBAC migration for components beyond the 8 identified in the proposal
- Backend RBAC enforcement (P5 — future change)
- Multi-tenant RBAC (out of scope — ByBusiness-exclusive)

## Dependencies

- S10: none (per proposal — cross-slice RBAC has no upstream dependencies)

## Acceptance Criteria

- [ ] 8 components wrapped with `useRbac` (exact list per proposal slice plan)
- [ ] Each component has appropriate permission gate (read, write, or admin)
- [ ] Components without permission show access-denied state
- [ ] Existing RBAC-protected components are not modified
- [ ] No duplicate RBAC guards added
- [ ] `useRbac` is opt-in (no implicit global enforcement)
- [ ] No `console.log`, no inline styles
- [ ] E2E smoke spec: verify RBAC guard triggers correctly for authorized and unauthorized users
