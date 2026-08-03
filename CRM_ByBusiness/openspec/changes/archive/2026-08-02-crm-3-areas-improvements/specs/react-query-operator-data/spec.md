# Spec: react-query-operator-data (S06)

## Purpose

Migrate the `useOperatorData` custom hook from the `useEffect + n8nGet` anti-pattern to `useN8nQuery` (TanStack Query v5), gaining automatic stale-time, retry, and loading state management without changing the data contract.

## Affected Components

- `src/hooks/useOperatorData.js` (modified)
- `src/components/dashboard/OperatorDashboard.jsx` (consumer — already uses the hook)
- `src/shared/hooks/useN8n.js` (provides `useN8nQuery` — already exists)

## Requirements

### REQ-001: useOperatorData uses useN8nQuery internally

The `useOperatorData` hook MUST delegate data fetching to `useN8nQuery` instead of `useEffect + n8nGet` directly.

#### Scenario: useOperatorData returns same data shape as before

- GIVEN `useOperatorData(operatorId)` is called by a consumer component
- WHEN the hook executes
- THEN it calls `useN8nQuery` with the same endpoint, params, and operator context
- AND the return value contains `leads`, `loading`, `error`, and `refetch` — the same shape the existing consumer expects

#### Scenario: Loading state transitions work correctly

- GIVEN `useOperatorData` is called
- WHEN data is being fetched for the first time
- THEN `loading === true` and `leads === undefined`
- WHEN data arrives
- THEN `loading === false` and `leads` contains the lead array
- WHEN an error occurs
- THEN `loading === false` and `error` contains the error object

#### Scenario: Error retry is automatic

- GIVEN `useOperatorData` made a request that failed
- WHEN `useN8nQuery` retry logic triggers a background refetch
- THEN the operator does not need to manually trigger a refetch
- AND `loading === true` during the retry

### REQ-002: useN8nQuery configuration for lead data

The `useN8nQuery` call inside `useOperatorData` MUST be configured with appropriate `staleTime`, `refetchInterval` (if applicable), and `retry` parameters.

#### Scenario: Stale time prevents unnecessary refetches

- GIVEN `useOperatorData` has fetched data and it is still within `staleTime`
- WHEN the component re-renders
- THEN no new network request is made
- AND cached data is returned immediately

#### Scenario: Background refetch on window focus

- GIVEN `useOperatorData` has cached data
- WHEN the browser window regains focus
- THEN `useN8nQuery` may refetch in the background (per TanStack Query defaults)
- AND `loading === false` while refetch runs in background
- AND the UI is not blocked

### REQ-003: Backward compatibility with existing consumers

All existing components consuming `useOperatorData` MUST continue to work without modification.

#### Scenario: OperatorDashboard uses useOperatorData without changes

- GIVEN `OperatorDashboard` calls `useOperatorData(operatorId)` as before
- WHEN the hook is migrated to `useN8nQuery`
- THEN the component's behavior is unchanged (same leads displayed, same loading state)
- AND no props need to be added or removed from the component

#### Scenario: Leads list still shows correct data

- GIVEN `useOperatorData` returns `{ leads, loading, error, refetch }`
- WHEN the consumer renders the leads list
- THEN each lead shows the same fields as before migration
- AND no field is missing or renamed

### REQ-004: No regression in error handling

The error handling behavior of `useOperatorData` MUST remain equivalent after migration.

#### Scenario: Network error is surfaced to consumer

- GIVEN `useOperatorData` encounters a network failure
- WHEN the error is caught
- THEN `error` is populated with the failure reason
- AND `loading === false`
- AND `leads` is `undefined` or empty

#### Scenario: 401 Unauthorized triggers appropriate error

- GIVEN the n8n API returns 401 for `useOperatorData`
- WHEN the error is caught
- THEN `error` reflects authentication failure
- AND the consumer can redirect to login if appropriate

## Out of Scope

- Changing the data contract (lead fields, response shape)
- Migrating other hooks in the same PR
- Adding new features to `useOperatorData`
- Changing the n8n endpoint URL

## Dependencies

- S06 depends on S04 (Zone4 KPI strip uses `useOperatorData`; the hook must be stable before S04 ships)

## Acceptance Criteria

- [ ] `useOperatorData` internally uses `useN8nQuery`
- [ ] Return value shape unchanged: `{ leads, loading, error, refetch }`
- [ ] `loading === true` on initial fetch, `false` after data arrives
- [ ] Stale time prevents unnecessary refetches
- [ ] `OperatorDashboard` works without any changes to its own code
- [ ] No `console.log`, no inline styles
- [ ] E2E smoke spec confirms leads still load after migration
