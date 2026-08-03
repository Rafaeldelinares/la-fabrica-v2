# Review Workload Forecast: crm-critical-followups

## Review Workload Forecast
slice_count: 3
total_changed_lines_estimate: 880
per_slice_lines: [
  { slice: "F01", lines: 80 },
  { slice: "F02", lines: 100 },
  { slice: "F03", lines: 700 }
]
max_slice_lines: 700
review_budget_lines: 800
budget_exceeded_slices: []
chained_PRs_recommended: yes
decision_needed_before_apply: no
decision_reasons: []

---

## Summary

- **3 slices**, all within the 800-line budget (max: 700, F03).
- **Force-chained delivery** (`delivery_strategy: force-chained`): orchestrator proceeds without asking.
- Chain strategy: **stacked-to-main** (each PR merges to main in order F01→F02→F03).

## Critical Risks

| Risk | Slice | Mitigation |
|------|-------|------------|
| R1 — F03 14 existing E2E specs are the regression safety net | F03 | Verify specs pass after each component split commit |
| R2 — spec wording typo correction (`cancelado` → `cancelada`) | F02 | Inline fix in spec file during verification |
| R3 — New `*.helpers.js` convention: C5 must establish pattern first | F03 | C5 is smallest component; C5→C4→C1→C2→C3 order |

## Implementation Order

F01 → F02 → F03

- **F01** (lowest risk, enables F03 navigation verification): Adds 4 sidebar entries + routing for admin panels.
- **F02** (pure verification, no code change): Inspects DB function and workflow; fixes spec typo.
- **F03** (largest, mechanical refactor): 5 component splits, one commit per component.

## Quality Gates

- Each slice: E2E smoke spec in `e2e/f{nn}-*.spec.js`.
- F03: Components ≤150 LOC after refactor.
- F03: Public API unchanged — 14 existing specs pass unmodified.
- F03: No new `*.helpers.js` or `use*Logic.js` files exist yet — C5 establishes pattern.

## Rollback

Per-slice `git revert` is independent. No DB → no data rollback. No new workflows → no deactivation needed. Reverse order F03→F02→F01 restores exact `crm-3-areas-improvements` end state.
