# Review Workload Forecast: crm-3-areas-improvements

## Review Workload Forecast
slice_count: 14
total_changed_lines_estimate: 6930
per_slice_lines: [
  { slice: "S01", lines: 80 },
  { slice: "S02", lines: 450 },
  { slice: "S03", lines: 250 },
  { slice: "S04", lines: 350 },
  { slice: "S05", lines: 650 },
  { slice: "S06", lines: 250 },
  { slice: "S07", lines: 500 },
  { slice: "S08", lines: 700 },
  { slice: "S09", lines: 600 },
  { slice: "S10", lines: 750 },
  { slice: "S11", lines: 600 },
  { slice: "S12", lines: 450 },
  { slice: "S13", lines: 550 },
  { slice: "S14", lines: 750 }
]
max_slice_lines: 750
review_budget_lines: 800
budget_exceeded_slices: []
chained_PRs_recommended: yes
decision_needed_before_apply: no
decision_reasons: []

---

## Summary

- **14 slices**, all within the 800-line budget (max: 750 lines, S10 and S14).
- No slice splits required.
- **Force-chained delivery** (`delivery_strategy: force-chained`): orchestrator proceeds with S01 without asking.
- Chain strategy: **stacked-to-main** (each PR merges to main in order S01→S14). Each slice is independently shippable and reversible.

## Critical Risks

| Risk | Slices | Mitigation |
|------|--------|------------|
| R1 — Scraper `/health` endpoint missing | S11–S14 | Document in S11 acceptance; defer if blocked |
| R7 — Scraper config API not exposed | S14 | Show "Configuración via variables de entorno" fallback |
| R8 — `UsuariosList` 722 LOC / `AgendaGlobalPanel` 740 LOC | S10 | Wrap at top only; no body rewrite |
| R11 — `useOperatorData` public API stability | S06 | Preserve return shape; manual verification |

## Implementation Order

S01 → S02 → S03 → S04 → S05 → S06 → S07 → S08 → S09 → S10 → S11 → S12 → S13 → S14

- **S01–S03** (Cross): Foundation — no external deps, cheapest first.
- **S04–S07** (Area B): Operator features — no Area A/C external deps.
- **S08–S10** (Area C): Admin features — S08/S09 need S03; S10 is independent.
- **S11** (Area A root): Scraper health — dependency root for S12–S14.
- **S12–S14** (Area A fan-out): Each depends on S11.

## Quality Gates

- Each slice: E2E smoke spec in `e2e/{slice-name}.spec.js`.
- `npm run test:e2e` passes for all 14 specs before archive.
- Components max 150 LOC (verify before commit).
- Zero inline styles, zero `console.log`, zero localhost fallbacks.
- No new RBAC permissions (AD-6 in design.md).
- Frontend never accesses PostgreSQL directly.
