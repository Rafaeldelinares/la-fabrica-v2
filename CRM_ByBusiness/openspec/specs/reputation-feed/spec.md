# Spec: reputation-feed (S12)

## Purpose

Wire the Monitor Reputación engine (`:8092`) into the `REPUTACIÓN` tab of `Zone2Content` in the operator view, replacing the "Próximamente" stub with live reputation data. A new `CRM_REPUTACION_LEAD` workflow calls the Go engine.

## Affected Components

- `src/components/dashboard/zones/Zone2Content.jsx` (REPUTACIÓN tab body — currently stubbed)
- `src/components/dashboard/zones/ReputacionTab.jsx` (new — tab content component)
- Workflow: `CRM_REPUTACION_LEAD` (new — calls Go engine `:8092`)
- External: Monitor Reputación Go engine at `:8092`

## Requirements

### REQ-001: REPUTACIÓN tab shows live reputation data

The REPUTACIÓN tab in `Zone2Content` MUST display live reputation data instead of the "Próximamente" stub.

#### Scenario: REPUTACIÓN tab loads with live data

- GIVEN the operator is viewing a lead with a Google Business Profile
- WHEN they click the "REPUTACIÓN" tab in `Zone2Content`
- THEN the tab body shows: overall score (0–100), star rating, review count, and last 3 reviews
- AND a loading skeleton is shown while data fetches

#### Scenario: Lead has no GBP data yet

- GIVEN the lead has no Google Business Profile associated
- WHEN the operator clicks the REPUTACIÓN tab
- THEN a "Sin datos de reputación disponibles" empty state is shown
- AND no error is thrown

#### Scenario: Monitor engine is unreachable (R2 mitigation)

- GIVEN the Monitor Reputación engine at `:8092` is down
- WHEN the REPUTACIÓN tab loads
- THEN the panel shows "Reputación temporalmente no disponible"
- AND no error propagates to the operator
- AND the error is logged via `reportError()` (S02/S03)

### REQ-002: Reputation data includes alert state

The REPUTACIÓN tab MUST show an alert state when the reputation score drops below a configurable threshold (default: score < 3.5 stars or score < 60/100).

#### Scenario: Low reputation score triggers alert

- GIVEN a lead has a reputation score of 3.2 stars
- WHEN the REPUTACIÓN tab renders
- THEN an alert banner is shown: "Puntuación por debajo del umbral"
- AND the alert uses the `#D00000` accent color

#### Scenario: Normal reputation shows no alert

- GIVEN a lead has a reputation score of 4.5 stars
- WHEN the REPUTACIÓN tab renders
- THEN no alert banner is shown
- AND the reputation card displays normally

### REQ-003: CRM_REPUTACION_LEAD workflow contract

The `CRM_REPUTACION_LEAD` workflow MUST accept `{ place_id: string }` and call the Go engine at `:8092`. It MUST return `{ score: number, stars: number, review_count: number, reviews: Array<{ author, text, rating, date }>, alert_state: boolean, refreshed_at: string }`.

#### Scenario: CRM_REPUTACION_LEAD returns valid reputation data

- GIVEN `CRM_REPUTACION_LEAD` is called with a `place_id`
- WHEN it calls the Go engine at `:8092`
- THEN it returns the full reputation object with the schema above
- AND `alert_state` is derived from score < 60 or stars < 3.5

#### Scenario: Go engine returns partial data

- GIVEN the Go engine returns partial data (score and stars but no reviews)
- WHEN `CRM_REPUTACION_LEAD` processes the response
- THEN it returns available fields and sets missing fields to `null`
- AND `alert_state` is computed from available data

#### Scenario: Go engine is unreachable (R2 mitigation)

- GIVEN `CRM_REPUTACION_LEAD` cannot reach `:8092`
- WHEN the workflow runs
- THEN it returns `{ score: null, stars: null, review_count: null, reviews: [], alert_state: false, error: 'Engine unavailable' }`
- AND it does NOT throw an error

## Out of Scope

- Triggering re-scrapes (covered by S13)
- Configuring alert thresholds (future enhancement)
- Historical reputation charts (future enhancement)
- GBP tab in `ClienteDrawer` (covered by S13)
- P3 toggle modifications

## Dependencies

- S12 depends on S11 (scraper health must be established as Area A dependency root)
- S12 reads data from Monitor Reputación Go engine — contract must be confirmed before production shipping (R2 risk from proposal)

## Acceptance Criteria

- [ ] "Próximamente" stub removed from REPUTACIÓN tab in `Zone2Content`
- [ ] `ReputacionTab` component created with live reputation display
- [ ] Score (0–100), stars (1–5), review count displayed
- [ ] Last 3 reviews shown with author, text, rating, date
- [ ] Alert banner shown when score < 60 or stars < 3.5
- [ ] Empty state when no GBP data available
- [ ] Graceful degradation when Go engine is unreachable
- [ ] `reportError()` called when engine is unreachable (S02 integration)
- [ ] `CRM_REPUTACION_LEAD` returns correct schema
- [ ] Loading skeleton shown during fetch
- [ ] No `console.log`, no inline styles, no spinners

### REQ-004: ReputacionTab component split

The `ReputacionTab` component (170 LOC) MUST be refactored into `ReputacionTab.jsx` (≤150 LOC) plus `reputacionHelpers.js` (utility functions). The public API (props, events, workflow calls to `CRM_REPUTACION_LEAD`) remains unchanged.

#### Scenario: ReputacionTab split preserves all existing behavior

- GIVEN `ReputacionTab` is refactored into component + helpers
- WHEN the refactored component renders in the REPUTACIÓN tab of `Zone2Content`
- THEN all existing behavior is preserved (score display, alert banner, empty state, graceful degradation)
- AND 14 existing E2E specs continue to pass without modification
