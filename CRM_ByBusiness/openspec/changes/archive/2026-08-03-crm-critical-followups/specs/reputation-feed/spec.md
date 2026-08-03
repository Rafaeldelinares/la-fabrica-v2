# Delta Spec: reputation-feed (F03 Split)

## MODIFIED Requirements

### Requirement: REQ-00X: ReputacionTab component split

The `ReputacionTab` component (170 LOC) MUST be refactored into `ReputacionTab.jsx` (≤150 LOC) plus `reputacionHelpers.js` (utility functions). The public API (props, events, workflow calls to `CRM_REPUTACION_LEAD`) remains unchanged.

(Previously: Single monolithic `ReputacionTab.jsx` at 170 LOC)

#### Scenario: ReputacionTab split preserves all existing behavior

- GIVEN `ReputacionTab` is refactored into component + helpers
- WHEN the refactored component renders in the REPUTACIÓN tab of `Zone2Content`
- THEN all existing behavior is preserved (score display, alert banner, empty state, graceful degradation)
- AND 14 existing E2E specs continue to pass without modification
