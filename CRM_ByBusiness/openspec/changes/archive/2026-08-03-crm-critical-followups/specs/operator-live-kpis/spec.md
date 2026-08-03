# Delta Spec: operator-live-kpis (F03 Split)

## MODIFIED Requirements

### Requirement: REQ-00X: MisKpiStrip component split

The `MisKpiStrip` component (158 LOC) MUST be refactored into `MisKpiStrip.jsx` (≤150 LOC) plus `useKpiStripLogic.js` (custom hook). The public API (props, events, data contract with `CRM_OPERADOR_KPI_LIVE`) remains unchanged.

(Previously: Single `MisKpiStrip` component at 158 LOC — already under 150 LOC but being refactored to establish helper/hook pattern for consistency)

#### Scenario: MisKpiStrip split preserves all existing behavior

- GIVEN `MisKpiStrip` is refactored into component + hook
- WHEN the refactored component renders in Zone4 of `OperatorDashboard`
- THEN all existing behavior is preserved (KPI display, 30s refresh, skeleton, stale indicator)
- AND 14 existing E2E specs continue to pass without modification
