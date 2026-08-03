# Spec: admin-error-boundaries (S02)

## Purpose

Wrap React component sub-trees in error boundaries that catch uncaught JavaScript errors and report them to `sistema.eventos_sistema` via the extended `CRM_60_POST_EVENTO_SISTEMA` workflow with a new `FRONTEND_ERROR` event type.

## Affected Components

- `src/shared/errors/ErrorBoundary.jsx` (new)
- `src/shared/errors/reportError.js` (new)
- `src/components/dashboard/OperatorDashboard.jsx` (wraps each Zone)
- `src/modules/admin/` (admin panel error boundaries)
- `src/modules/admin/gbp/GbpPanel.jsx` (wraps content)
- Workflow: `CRM_60_POST_EVENTO_SISTEMA` (extended with `FRONTEND_ERROR` event_type)

## Requirements

### REQ-001: ErrorBoundary component contract

The system MUST provide an `ErrorBoundary` component that catches JavaScript errors thrown in its child component tree, logs the error, and renders a fallback UI without crashing the parent application.

#### Scenario: ErrorBoundary catches a render error

- GIVEN an `ErrorBoundary` wraps a child component
- WHEN the child throws a JavaScript error during render
- THEN the error is caught by the boundary
- AND a fallback UI is rendered instead of the crashed child
- AND the error is reported via `reportError()`

#### Scenario: ErrorBoundary allows normal render

- GIVEN an `ErrorBoundary` wraps a child component that does NOT throw
- WHEN the child renders normally
- THEN the child's output is displayed
- AND no fallback UI is rendered

### REQ-002: reportError posts FRONTEND_ERROR to eventos_sistema

The system MUST call `reportError()` when an error is caught, which POSTs to `CRM_60_POST_EVENTO_SISTEMA` with `event_type = 'FRONTEND_ERROR'` and structured error metadata.

#### Scenario: reportError sends FRONTEND_ERROR event

- GIVEN an error is caught by the ErrorBoundary
- WHEN `reportError(error, { componentStack, zoneId })` is called
- THEN a POST is made to the `CRM_60_POST_EVENTO_SISTEMA` webhook
- AND the payload includes `event_type = 'FRONTEND_ERROR'`, error message, component stack trace, zone identifier, and timestamp
- AND the POST does NOT block the fallback UI from rendering

#### Scenario: reportError handles network failure gracefully

- GIVEN an error is caught and `reportError()` is called
- WHEN the POST to `CRM_60_POST_EVENTO_SISTEMA` fails due to network error
- THEN the error is logged via `console.error` (development only)
- AND the fallback UI is rendered without delay
- AND the failed POST does not propagate an error to the user

### REQ-003: CRM_60_POST_EVENTO_SISTEMA accepts FRONTEND_ERROR

The `CRM_60_POST_EVENTO_SISTEMA` workflow MUST accept `event_type = 'FRONTEND_ERROR'` as a valid event type and store it in `sistema.eventos_sistema` with the extended payload schema.

#### Scenario: FRONTEND_ERROR event stored in sistema.eventos_sistema

- GIVEN a FRONTEND_ERROR event is POSTed to `CRM_60_POST_EVENTO_SISTEMA`
- WHEN the workflow processes the payload
- THEN a new row is inserted into `sistema.eventos_sistema` with `event_type = 'FRONTEND_ERROR'`
- AND `error_message`, `component_stack`, `zone_id`, and `timestamp` are stored in the row

### REQ-004: OperatorDashboard zones wrapped individually

The system MUST wrap each zone (Zone1–Zone4) of `OperatorDashboard` in its own `ErrorBoundary` instance so that one zone's error does not crash the entire dashboard.

#### Scenario: Zone2 error does not affect Zone1

- GIVEN `OperatorDashboard` is rendered with separate `ErrorBoundary` wrappers per zone
- WHEN Zone2Content throws an error
- THEN Zone1Filters, Zone3Sidebar, and Zone4Sidebar remain visible and functional
- AND Zone2 shows its fallback UI
- AND the error is reported to `sistema.eventos_sistema`

## Out of Scope

- P3 toggle functionality — error boundaries do not modify business logic
- Backend changes beyond extending `CRM_60_POST_EVENTO_SISTEMA` event types
- Global uncaught exception handler (`window.onerror`) — handled by S03 dev shim
- Error recovery (retry logic) — falls back to initial state only
- RBAC-gated error visibility — all errors are visible to admins

## Dependencies

- S02: none (cross-cut, foundational)
- Depends on `CRM_60_POST_EVENTO_SISTEMA` existing workflow (extended, not created)

## Acceptance Criteria

- [ ] `ErrorBoundary.jsx` created with React error boundary API (`componentDidCatch`, `getDerivedStateFromError`)
- [ ] `reportError()` function created that POSTs to `CRM_60_POST_EVENTO_SISTEMA`
- [ ] `CRM_60_POST_EVENTO_SISTEMA` workflow extended with `FRONTEND_ERROR` event_type
- [ ] `OperatorDashboard` wraps each zone in its own `ErrorBoundary`
- [ ] Network failure in `reportError` does not affect UI rendering
- [ ] No `console.log` in production; `console.error` only in dev fallback path
- [ ] E2E smoke spec triggers a test error and verifies a row appears in `sistema.eventos_sistema`
