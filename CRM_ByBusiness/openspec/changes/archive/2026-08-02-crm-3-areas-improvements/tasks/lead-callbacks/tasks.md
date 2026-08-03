# Tasks: S05 — lead-callbacks (MisCallbacksPanel)

**Slice:** S05
**Area:** B (Operador)
**Title:** Callback management panel with reschedule/cancel
**Capability:** `lead-callbacks`
**Depends on:** S04 (Zone4 must exist for placement)
**Delivery order:** 5 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

---

## Phase 1: MisCallbacksPanel Component

- [x] 1.1 Create `src/components/dashboard/MisCallbacksPanel.jsx` (~140 LOC). Shows today's callbacks: contact name, scheduled time, status badge, "Reprogramar" + "Cancelar" buttons. Uses `useN8nQuery(['callbacks-hoy', userId], 'crm-callbacks-operador', { refetchInterval: 60_000 })`. Empty state: "Sin callbacks programados". Skeleton loading. Files: `src/components/dashboard/MisCallbacksPanel.jsx` (new). Kind: frontend. Est: ~140 lines. Acceptance: list renders; empty state shows when no callbacks. Depends on: S04.
- [x] 1.2 Implement reschedule flow: datetime picker modal → `useN8nMutation('crm-callbacks-gestionar', { action: 'reschedule', callback_id, new_datetime })`. Success updates list; error notification shown. Files: `src/components/dashboard/MisCallbacksPanel.jsx` (same file). Kind: frontend. Est: ~60 lines. Acceptance: reschedule flow completes; list updates on success. Depends on: 1.1, 2.1.
- [x] 1.3 Implement cancel flow: confirmation dialog "¿Cancelar este callback?" → `useN8nMutation('crm-callbacks-gestionar', { action: 'cancel', callback_id })`. Callback disappears from list on success. Files: `src/components/dashboard/MisCallbacksPanel.jsx` (same file). Kind: frontend. Est: ~40 lines. Acceptance: cancel removes item from list. Depends on: 1.1, 2.1.

---

## Phase 2: Dashboard Integration + Workflow

- [x] 2.1 Mount `MisCallbacksPanel` in `OperatorDashboard.jsx` Zone4, below `MisKpiStrip`. Files: `src/components/dashboard/OperatorDashboard.jsx`. Kind: frontend. Est: ~15 lines. Acceptance: panel renders below KPI strip. Depends on: 1.1.
- [x] 2.2 Create `CRM_CALLBACKS_GESTIONAR` n8n workflow (new). POST actions: `reschedule` (updates `scheduled_at` in DB) and `cancel` (marks as cancelled). Returns `{ success, callback?, error? }`. Handles watchdog conflict gracefully. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~150 lines. Acceptance: reschedule and cancel both work; watchdog conflict returns graceful error. Depends on: none.

---

## Phase 3: R4 Verification

- [ ] 3.1 Verify `CRM_WATCHDOG_CALLBACKS` does not double-process cancelled callbacks. Document in acceptance comment. Files: n8n workflow (read-only review). Kind: backend-workflow. Est: ~10 lines review. Acceptance: watchdog skips already-cancelled callbacks. Depends on: 2.2.

---

## Phase 4: E2E Smoke

- [x] 4.1 Create `e2e/s05-lead-callbacks.spec.js`. Test: list callbacks, reschedule one, cancel one. Files: `e2e/s05-lead-callbacks.spec.js` (new). Kind: test. Est: ~80 lines. Acceptance: spec passes. Depends on: 1.1, 2.1, 2.2.

---

## Critical Risk

- ⚠️ **R4** (MED): Callback watchdog queue conflict — S05 must verify with infra team that `CRM_WATCHDOG_CALLBACKS` skips already-processed callbacks.

---

## Commit Plan

```
feat(operator): create MisCallbacksPanel with list, reschedule, cancel
feat(operator): mount MisCallbacksPanel below KPIs in Zone4
feat(workflow): create CRM_CALLBACKS_GESTIONAR for reschedule/cancel
```

**Commit 1** — `src/components/dashboard/MisCallbacksPanel.jsx` (1 file).
**Commit 2** — `src/components/dashboard/OperatorDashboard.jsx` (1 file).
**Commit 3** — workflow (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s05-lead-callbacks.spec.js` passes.
- Manual: cancel a callback, verify `CRM_WATCHDOG_CALLBACKS` does not re-process it.

---

## Rollback Plan

Revert commits. Hide panel via feature flag (show "temporaneamente no disponible" message). Disable `CRM_CALLBACKS_GESTIONAR` workflow. Boundary: this slice only.
