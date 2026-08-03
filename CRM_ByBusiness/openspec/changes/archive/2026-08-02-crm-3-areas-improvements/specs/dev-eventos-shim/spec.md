# Spec: dev-eventos-shim (S03)

## Purpose

Provide a frontend-only development shim for the `sistema.eventos_sistema` DB gap: in local development, `reportError()` logs to `console.error` AND attempts to POST to `CRM_60_POST_EVENTO_SISTEMA` only when the `eventos_sistema` table is reachable (dev DB has the table on VPS via tunnel, but local `crm_bybusiness` does not).

## Affected Components

- `src/shared/errors/reportError.js` (modified: add dev shim logic)
- `src/shared/errors/ErrorBoundary.jsx` (uses reportError — already covered by S02)
- `README.md` or `CONTRIBUTING.md` (document the dev DB gap)

## Requirements

### REQ-001: reportError detects dev environment

The `reportError()` function MUST detect whether it is running in a development environment (via `import.meta.env.DEV` or `VITE_` prefix) and apply dev-specific behavior.

#### Scenario: reportError in dev mode logs to console.error

- GIVEN `reportError()` is called in a development environment (`import.meta.env.DEV === true`)
- WHEN the function executes
- THEN it logs the error details via `console.error` with structured metadata
- AND it also attempts the POST to `CRM_60_POST_EVENTO_SISTEMA` if the endpoint is reachable

#### Scenario: reportError in production mode skips console

- GIVEN `reportError()` is called in a production build
- WHEN the function executes
- THEN it does NOT call `console.error`
- AND it only POSTs to `CRM_60_POST_EVENTO_SISTEMA`

### REQ-002: reportError handles eventos_sistema table absence gracefully

The system MUST handle the case where `sistema.eventos_sistema` does not exist in the local development database (the table lives on VPS `crm_bybusiness`).

#### Scenario: POST fails due to missing local table

- GIVEN `reportError()` attempts to POST to `CRM_60_POST_EVENTO_SISTEMA`
- WHEN the POST fails because `eventos_sistema` table is absent locally (dev DB gap)
- THEN the error is logged to `console.error` (dev only)
- AND no error is thrown to the caller
- AND the fallback UI in ErrorBoundary still renders

#### Scenario: POST succeeds on VPS tunnel connection

- GIVEN `reportError()` attempts to POST in dev with VPS tunnel active
- WHEN the POST succeeds (table reachable via n8n VPS tunnel)
- THEN the FRONTEND_ERROR event is stored in `sistema.eventos_sistema`
- AND dev console shows a success confirmation message

### REQ-003: Dev DB gap documented in CONTRIBUTING

The CONTRIBUTING or README documentation MUST note that `sistema.eventos_sistema` is not present in local `crm_bybusiness` and explain how to verify the VPS tunnel is active for local development.

#### Scenario: CONTRIBUTING documents the eventos_sistema dev gap

- GIVEN a new developer reads the CONTRIBUTING guide
- WHEN they reach the "Local Development Setup" section
- THEN they find a note explaining that `eventos_sistema` table is on VPS and requires an active tunnel
- AND instructions for verifying tunnel connectivity are present
- AND the note clarifies that FRONTEND_ERROR events will only appear in the VPS DB during local development

## Out of Scope

- Changing the actual database schema (P3 blocked)
- Creating a local `eventos_sistema` table in the Docker compose
- Modifying `CRM_60_POST_EVENTO_SISTEMA` workflow logic
- Any backend code changes

## Dependencies

- S02 (must be applied before or alongside S03 since S03 extends reportError)
- No workflow changes

## Acceptance Criteria

- [ ] `reportError()` in dev mode (`import.meta.env.DEV`) logs to `console.error`
- [ ] `reportError()` in production mode does not log to console
- [ ] Missing `eventos_sistema` table does not crash the ErrorBoundary
- [ ] CONTRIBUTING or README documents the dev DB gap and tunnel verification
- [ ] No `console.log` in production path
- [ ] E2E smoke spec in CI (no console.error expected since CI has no `eventos_sistema` access)
