# Tasks: S06 — react-query-operator-data

**Slice:** S06
**Area:** B (Operador)
**Title:** useOperatorData → useN8nQuery migration
**Capability:** `react-query-operator-data`
**Depends on:** S04 (Zone4 KPI strip uses useOperatorData; hook must be stable before S04 ships)
**Delivery order:** 6 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: Hook Migration

- [x] 1.1 Refactor `src/hooks/useOperatorData.js` (~204 LOC existing). Internally: 5 separate `useN8nQuery` calls (callback-programadas, llamada-activa, stats, campanas, historial) + 1 `useN8nMutation` (registrar-resultado). Preserve public return shape: `{ leads?, loading, error, refetch, stats?, campanas?, historial?, llamadaActiva?, callbackProgramadas? }`. Files: `src/hooks/useOperatorData.js` (rewrite). Kind: frontend. Est: ~200 lines. Acceptance: return shape unchanged from consumer perspective. Depends on: S04.
- [x] 1.2 Verify `OperatorDashboard.jsx` works without any changes to its own code. Files: `src/components/dashboard/OperatorDashboard.jsx`. Kind: frontend. Est: ~5 lines (no changes expected). Acceptance: dashboard renders leads and all zones without modification. Depends on: 1.1.

---

## Phase 2: Verification

- [x] 2.1 Create `e2e/s06-react-query-operator-data.spec.js`. Test: log in as operator, verify leads still load and display in Zone1. Files: `e2e/s06-react-query-operator-data.spec.js` (new). Kind: test. Est: ~40 lines. Acceptance: spec passes; leads display correctly. Depends on: 1.1.

---

## Critical Risk

- ⚠️ **R11** (MED): `useOperatorData` public API stability — S06 must preserve exact return shape. Any field rename or restructure breaks `OperatorDashboard`.
- `AgendaGlobalPanel` also uses `useOperatorData` — must be verified after migration.

---

## Commit Plan

```
refactor(operator): migrate useOperatorData to use useN8nQuery internally
```

**Commit 1** — `src/hooks/useOperatorData.js`, `src/components/dashboard/OperatorDashboard.jsx` (2 files, ≤3 files).

---

## Verification Plan

- `npm run test:e2e` — `s06-react-query-operator-data.spec.js` passes.
- Manual: confirm loading state transitions work (loading=true → loading=false after data arrives).
- Manual: confirm error state surfaces correctly (simulate API failure).
- Manual: confirm window-focus refetch works without blocking UI.

---

## Rollback Plan

`git revert` the commit. Legacy `useEffect + n8nGet` restored from git history. `OperatorDashboard` unchanged. Boundary: this slice only.
