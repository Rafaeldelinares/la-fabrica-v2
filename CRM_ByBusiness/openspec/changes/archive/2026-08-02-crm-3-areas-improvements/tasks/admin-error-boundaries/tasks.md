# Tasks: S02 — admin-error-boundaries

**Slice:** S02
**Area:** Cross
**Title:** Admin error boundaries + eventos_sistema reporting (P6)
**Capability:** `admin-error-boundaries`
**Depends on:** none (cross-cut foundational)
**Delivery order:** 2 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

---

## Phase 1: ErrorBoundary Component

- [x] 1.1 Create `src/shared/errors/ErrorBoundary.jsx` (~80 LOC). Uses `componentDidCatch` + `getDerivedStateFromError`. Renders Navy Industrial skeleton + retry button on error. Accepts optional `zoneId` prop. Files: `src/shared/errors/ErrorBoundary.jsx` (new). Kind: frontend. Est: ~80 lines. Acceptance: renders children normally; shows fallback on error. Depends on: none.
- [x] 1.2 Create `src/shared/errors/reportError.js` (~60 LOC). `n8nPost('crm-60-post-evento-sistema', payload)`. Payload: `{ event_type: 'FRONTEND_ERROR', error_message, component_stack, zone_id, timestamp, user_id }`. Wrapped in `try/catch` so network failure never propagates. Files: `src/shared/errors/reportError.js` (new). Kind: frontend. Est: ~60 lines. Acceptance: POSTs with correct payload shape; failure does not throw. Depends on: none.

---

## Phase 2: Dashboard Integration

- [x] 2.1 Wrap each of the 4 zones in `OperatorDashboard.jsx` with separate `ErrorBoundary` instances. Zone1, Zone2, Zone3, Zone4 each get their own boundary. Files: `src/components/dashboard/OperatorDashboard.jsx`. Kind: frontend. Est: ~40 lines (boundary wrappers + imports). Acceptance: Zone2 crash leaves Zone1/3/4 visible. Depends on: 1.1.
- [x] 2.2 Delete `src/components/dashboard/OperatorErrorBoundary.jsx`. Redirect any imports to `ErrorBoundary.jsx`. Files: `src/components/dashboard/OperatorErrorBoundary.jsx` (delete). Kind: frontend. Est: ~5 lines removed. Acceptance: no broken imports; old file gone. Depends on: 2.1.
- [x] 2.3 Wrap admin panel content areas with `ErrorBoundary`. Apply to `GbpPanel.jsx` content area. Files: `src/modules/admin/gbp/GbpPanel.jsx`. Kind: frontend. Est: ~20 lines. Acceptance: GbpPanel content area has boundary wrapper. Depends on: 1.1.

---

## Phase 3: Workflow Extension

- [x] 3.1 Extend `CRM_60_POST_EVENTO_SISTEMA` n8n workflow to accept `event_type='FRONTEND_ERROR'` and store extended payload (component_stack, zone_id) in `sistema.eventos_sistema`. No schema change. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~150 lines (workflow nodes). Acceptance: FRONTEND_ERROR rows appear in `sistema.eventos_sistema` after triggered error. Depends on: none.

---

## Phase 4: E2E Verification

- [x] 4.1 Create `e2e/s02-admin-error-boundaries.spec.js`. Test: trigger a render error in a zone, verify fallback UI renders and a row appears in `sistema.eventos_sistema`. Files: `e2e/s02-admin-error-boundaries.spec.js` (new). Kind: test. Est: ~60 lines. Acceptance: spec passes; FRONTEND_ERROR row confirmed. Depends on: 2.1, 3.1.

---

## Critical Risk

- ⚠️ **R6**: `sistema.eventos_sistema` absent in local dev — S03 shim needed alongside S02.
- OperatorDashboard zones: ensure each boundary is a separate instance (not shared state).

---

## Commit Plan

```
feat(errors): add ErrorBoundary component for zone-level error isolation
feat(errors): add reportError function for FRONTEND_ERROR events
feat(dashboard): wrap OperatorDashboard zones in individual ErrorBoundaries
chore(admin): wrap GbpPanel content area in ErrorBoundary
refactor(dashboard): delete legacy OperatorErrorBoundary, redirect imports
feat(workflow): extend CRM_60_POST_EVENTO_SISTEMA for FRONTEND_ERROR events
```

**Commit 1** — `src/shared/errors/ErrorBoundary.jsx`, `src/shared/errors/reportError.js` (2 files).
**Commit 2** — `src/components/dashboard/OperatorDashboard.jsx`, `src/components/dashboard/OperatorErrorBoundary.jsx` (delete) (2 files, ≤3 files).
**Commit 3** — `src/modules/admin/gbp/GbpPanel.jsx` (1 file).
**Commit 4** — workflow extension (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s02-admin-error-boundaries.spec.js` passes.
- Manual: throw a test error in Zone2; verify Zone1/3/4 remain interactive.
- DB check: `SELECT * FROM sistema.eventos_sistema WHERE event_type = 'FRONTEND_ERROR'` returns rows after test.

---

## Rollback Plan

Revert commits 1–4. Unwrap zone boundaries; delete `ErrorBoundary.jsx` and `reportError.js`; restore `OperatorErrorBoundary.jsx` from git. `sistema.eventos_sistema` rows persist but are harmless. Boundary: this slice only.
