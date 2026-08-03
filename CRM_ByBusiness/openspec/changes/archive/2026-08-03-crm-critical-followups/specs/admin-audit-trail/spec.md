# Delta Spec: admin-audit-trail (F01 Sidebar)

## MODIFIED Requirements

### Requirement: REQ-00X: Sidebar navigation to AdminAuditPanel via AUDIT_NEW route

The system MUST provide a Sistema navigation entry "Auditoría" in `Sidebar.jsx` that routes to the `AUDIT_NEW` tab in `WorkBody.jsx`, guarded by RBAC permission `reportes.read`. This replaces the legacy `AuditoriaPanel` direct routing.

(Previously: No sidebar requirement for audit trail — only direct URL or legacy AuditoriaPanel route)

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
