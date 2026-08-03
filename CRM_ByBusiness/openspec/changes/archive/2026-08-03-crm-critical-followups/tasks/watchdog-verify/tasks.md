# Tasks: F02 — Watchdog Verify

**Slice:** F02
**Area:** B (cross)
**Title:** Verify watchdog skip behavior and add E2E coverage
**Capability:** `lead-callbacks`
**Depends on:** none
**Delivery order:** 2 of 3

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: DB Function Verification

- [x] 1.1 Inspect `public.crm_watchdog_callbacks()` on VPS via `postgres-vps` MCP. Query: `SELECT prosrc FROM pg_proc WHERE proname = 'crm_watchdog_callbacks'`. Verify the function body contains `WHERE estado = 'pendiente'` or equivalent filter that excludes `cancelada`. Document the exact filter expression in `openspec/changes/crm-critical-followups/specs/lead-callbacks/spec.md` as R4 verification evidence. File: `openspec/changes/crm-critical-followups/specs/lead-callbacks/spec.md` (modify). Kind: verification. Est: ~10 lines. Acceptance: spec documents exact WHERE clause; filter excludes cancelled callbacks. Depends on: none.

---

## Phase 2: Workflow Verification

- [x] 2.1 Inspect `CRM_WATCHDOG_CALLBACKS_V2` workflow (VPS ID `oiCboRThnoOAeLxW`) via n8n MCP or SSH+curl. Verify: (a) active nodes are `Schedule Trigger` + `Ejecutar Watchdog`; (b) `Hay callbacks` (IF) and `Redistribuir Callback` (UPDATE) are disabled. Document finding in the same spec file. File: same spec file (modify). Kind: verification. Est: ~10 lines. Acceptance: spec documents disabled nodes and confirms only DB function executes. Depends on: 1.1.

---

## Phase 3: Spec Correction + E2E

- [x] 3.1 Fix spec typo in `openspec/changes/crm-critical-followups/specs/lead-callbacks/spec.md`: replace `'cancelado'` with `'cancelada'` in REQ-005 scenario text (lines 15, 23). File: `openspec/changes/crm-critical-followups/specs/lead-callbacks/spec.md` (modify). Kind: docs. Est: ~5 lines. Acceptance: spec uses correct feminine form matching `estado_programada` column type. Depends on: 1.1.

- [x] 3.2 Create `e2e/f02-watchdog-callbacks-skip.spec.js`. Test: calls `CRM_CALLBACKS_GESTIONAR` webhook to cancel a callback, then asserts that the callback is not re-processed by the watchdog. Use `page.waitForTimeout` to allow watchdog cycle to elapse (or mock the watchdog trigger). File: `e2e/f02-watchdog-callbacks-skip.spec.js` (new). Kind: test. Est: ~60 lines. Acceptance: spec passes against production. Depends on: 3.1.

- [x] 3.3 Register new spec in `playwright.config.js` if not already included. File: `playwright.config.js` (modify). Kind: test-config. Est: ~5 lines. Acceptance: `npm run test:e2e` runs the new spec. Depends on: 3.2.

---

## Critical Risks

- ⚠️ **R2**: VPS tunnel down blocks verification — if tunnel is down, document blocked state in spec and skip to next slice; re-verify when tunnel is restored.

---

## Commit Plan

```
docs(workflow): document CRM_WATCHDOG_CALLBACKS skip behavior verification
test(e2e): add f02-watchdog-callbacks-skip coverage
```

**Commit 1** — `openspec/changes/crm-critical-followups/specs/lead-callbacks/spec.md` (spec correction + verification docs).
**Commit 2** — `e2e/f02-watchdog-callbacks-skip.spec.js`, `playwright.config.js` (E2E + config).

---

## Verification Plan

- `npm run test:e2e -- f02-watchdog-callbacks-skip.spec.js` passes.
- Manual: inspect n8n execution history to confirm cancelled callback not re-processed.

---

## Rollback Plan

Revert commits. Spec file restored; E2E spec and playwright config change removed. No code changes to revert.
