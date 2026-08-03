# Spec: admin-audit-trail (S08)

## Purpose

Provide administrators with a read-only audit trail panel (`AdminAuditPanel`) that reads system events from `sistema.eventos_sistema` via a new `CRM_ADMIN_AUDIT_GET` workflow, covering cross-entity events: user management, campaign changes, lead reassignments, and FRONTEND_ERROR events from S02.

## Affected Components

- `src/modules/admin/auditoria/AdminAuditPanel.jsx` (new)
- `src/modules/admin/auditoria/AuditoriaPanel.jsx` (coexists — audit trail is separate from call history)
- Workflow: `CRM_ADMIN_AUDIT_GET` (new — paginated event query)
- DB: `sistema.eventos_sistema` (read-only, lives on VPS `crm_bybusiness`)

## Requirements

### REQ-001: AdminAuditPanel displays paginated audit events

The `AdminAuditPanel` MUST display a filterable, paginated list of system events fetched from `CRM_ADMIN_AUDIT_GET`.

#### Scenario: Admin opens audit trail panel

- GIVEN an admin user navigates to the audit trail panel
- WHEN the panel loads
- THEN events are displayed in reverse chronological order (newest first)
- AND each row shows: event type, timestamp, user who triggered it, affected entity, and a description

#### Scenario: Audit panel shows empty state on first load

- GIVEN the admin opens `AdminAuditPanel`
- WHEN no events exist in the queried range
- THEN an empty state is shown: "Sin eventos registrados"
- AND no error is thrown

#### Scenario: Pagination navigates through events

- GIVEN `AdminAuditPanel` has more than the page size (e.g., 50 events)
- WHEN the admin clicks "Siguiente" or a page number
- THEN the next page of events loads
- AND the current page indicator updates

### REQ-002: Audit events are filterable by type, user, and date

The `AdminAuditPanel` MUST provide filter controls for: event type, user, date range.

#### Scenario: Filter by event type

- GIVEN the admin has opened `AdminAuditPanel`
- WHEN they select event type `FRONTEND_ERROR` from the filter dropdown
- THEN only FRONTEND_ERROR events are displayed
- AND the filter is reflected in the URL or panel state

#### Scenario: Filter by date range

- GIVEN the admin has opened `AdminAuditPanel`
- WHEN they set a date range (e.g., last 7 days)
- THEN only events within that range are displayed
- AND events outside the range are excluded

#### Scenario: Combined filters

- GIVEN the admin applies multiple filters (event type + user + date)
- THEN all filters are applied AND-logic (not OR)
- AND the result matches all selected criteria

### REQ-003: Dev environment handles missing eventos_sistema gracefully

The system MUST handle the case where `sistema.eventos_sistema` is not present in the local development database.

#### Scenario: Local dev returns empty audit list

- GIVEN the admin is in local development environment
- WHEN `CRM_ADMIN_AUDIT_GET` is called
- WHEN the `sistema.eventos_sistema` table does not exist locally
- THEN the workflow returns `{ events: [], warning: 'Tabla no disponible en entorno local' }`
- AND the panel shows a notice: "Audit trail solo disponible en producción (VPS)"
- AND no error is thrown to the admin

#### Scenario: VPS returns audit events

- GIVEN the admin is in production (or has VPS tunnel active)
- WHEN `CRM_ADMIN_AUDIT_GET` is called
- THEN events are returned from `crm_bybusiness.sistema.eventos_sistema`
- AND the panel renders the event list normally

### REQ-004: CRM_ADMIN_AUDIT_GET workflow contract

The `CRM_ADMIN_AUDIT_GET` workflow MUST accept `{ event_type?: string, user_id?: string, desde?: string, hasta?: string, page?: number, page_size?: number }` and return `{ events: Array<{ id, event_type, timestamp, user_id, user_name, entity_type, entity_id, description, metadata }>, total: number, page: number, page_size: number }`.

#### Scenario: Returns paginated events

- GIVEN `CRM_ADMIN_AUDIT_GET` is called with pagination params
- WHEN the workflow queries `sistema.eventos_sistema`
- THEN it returns `{ events: [...], total: N, page: 1, page_size: 50 }`
- AND events are sorted by `timestamp DESC`

#### Scenario: FRONTEND_ERROR events from S02 are queryable

- GIVEN FRONTEND_ERROR events have been written to `sistema.eventos_sistema` (by S02)
- WHEN `CRM_ADMIN_AUDIT_GET` is called with `event_type: 'FRONTEND_ERROR'`
- THEN those events appear in the result set
- AND metadata (component_stack, zone_id) is included in the event object

### REQ-005: AdminAuditPanel has RBAC guard

The system MUST guard `AdminAuditPanel` with the `auditoria.read` permission.

#### Scenario: Non-admin user cannot access audit panel

- GIVEN a user without `auditoria.read` permission navigates to `AdminAuditPanel`
- WHEN the component mounts
- THEN an access-denied message is shown
- AND no audit data is fetched

#### Scenario: Admin user can access audit panel

- GIVEN a user with `auditoria.read` permission navigates to `AdminAuditPanel`
- WHEN the component mounts
- THEN the panel renders and fetches audit data

## Out of Scope

- Writing events to `eventos_sistema` (handled by S02 and existing workflows)
- Exporting audit data to CSV
- Real-time audit event streaming (WebSocket) — future enhancement
- P3 toggle modifications
- DB schema changes to `eventos_sistema`

## Dependencies

- S08 depends on S03 (dev eventos shim — audit panel must handle missing table gracefully in dev)
- S08 reads FRONTEND_ERROR events written by S02 (dependency on S02's `eventos_sistema` extension)

## Acceptance Criteria

- [ ] `AdminAuditPanel` created in `src/modules/admin/auditoria/`
- [ ] Panel shows filterable, paginated list of audit events
- [ ] Filters work: event type, user, date range (AND-logic)
- [ ] Empty dev environment shows notice, not error
- [ ] `CRM_ADMIN_AUDIT_GET` returns correct paginated schema
- [ ] RBAC guard: `auditoria.read` permission required
- [ ] FRONTEND_ERROR events from S02 are queryable
- [ ] No `console.log`, no inline styles, no spinners
- [ ] E2E smoke spec: admin views audit events

### REQ-006: Sidebar navigation to AdminAuditPanel via AUDIT_NEW route

The system MUST provide a Sistema navigation entry "Auditoría" in `Sidebar.jsx` that routes to the `AUDIT_NEW` tab in `WorkBody.jsx`, guarded by RBAC permission `reportes.read` (per AD-1, `auditoria.read` does not exist in `rbac.js`). This replaces the legacy `AuditoriaPanel` direct routing.

#### Scenario: Admin accesses audit trail via Sidebar

- GIVEN an admin user is authenticated and `Sidebar.jsx` is rendered
- WHEN the "Sistema" section is expanded and "Auditoría" is clicked
- THEN `WorkBody.jsx` routes to the `AUDIT_NEW` tab
- AND `AdminAuditPanel` is rendered in the work area

#### Scenario: Legacy AuditoriaPanel route still works alongside new route

- GIVEN a user navigates to the legacy `AUDITORIA` route
- WHEN `WorkBody.jsx` resolves the route
- THEN the legacy `AuditoriaPanel` still renders (no regression)
- AND the new `AUDIT_NEW` route is the preferred navigation target

#### Scenario: Non-admin user does not see Auditoría entry

- GIVEN a user without `reportes.read` permission is authenticated
- WHEN `Sidebar.jsx` renders
- THEN the "Auditoría" entry is not visible in the Sistema section
- AND direct URL access to AUDIT_NEW returns access-denied
