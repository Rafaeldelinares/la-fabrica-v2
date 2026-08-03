# Spec: operator-live-kpis (S04)

## Purpose

Display a real-time KPI strip in Zone4 of `OperatorDashboard` showing: calls today, ventas hoy (sales today), tasa de conversión (conversion rate), and duración media (average call duration). Data refreshes every 30 seconds via a new `CRM_OPERADOR_KPI_LIVE` n8n workflow.

## Affected Components

- `src/components/dashboard/OperatorDashboard.jsx` (Zone4 modification)
- `src/components/dashboard/zones/Zone4Sidebar.jsx` (or new KPI strip component)
- `src/hooks/useOperatorData.js` (extension for KPI data)
- Workflow: `CRM_OPERADOR_KPI_LIVE` (new — aggregates today's operator stats)

## Requirements

### REQ-001: Zone4 displays 4 live KPIs

The Zone4 sidebar area of `OperatorDashboard` MUST display a strip with 4 KPIs: Calls Today, Ventas Hoy, Tasa Conversión, Duración Media.

#### Scenario: OperatorDashboard renders Zone4 KPI strip

- GIVEN the operator is authenticated and has an active session
- WHEN `OperatorDashboard` mounts and Zone4 renders
- THEN a KPI strip is displayed with 4 metric cards
- AND each card shows a label, current value, and a unit (e.g., "llamadas", "%", "min")

#### Scenario: KPI strip shows loading skeleton while data fetches

- GIVEN the operator is on `OperatorDashboard`
- WHEN the KPI data is being fetched
- THEN a skeleton loading state is shown in Zone4 (not a spinner)
- AND the rest of the dashboard remains interactive

#### Scenario: KPI strip shows stale indicator after timeout

- GIVEN the KPI data has been displayed for more than 60 seconds without refresh
- WHEN the data has not been refreshed
- THEN the strip shows a visual indicator that data may be stale (e.g., timestamp or icon)
- AND no error is shown unless all 3 consecutive refresh attempts fail

### REQ-002: KPI data auto-refreshes every 30 seconds

The KPI strip MUST refresh its data automatically every 30 seconds using `useN8nQuery` with a 30-second `refetchInterval`.

#### Scenario: KPI data refreshes automatically

- GIVEN the KPI strip has loaded initial data
- WHEN 30 seconds elapse without operator interaction
- THEN a background refetch is triggered via `useN8nQuery`
- AND the displayed values update without the operator triggering a page reload

#### Scenario: KPI refresh does not cause layout shift

- GIVEN the KPI strip is displayed
- WHEN a background refetch completes
- THEN the strip updates with new values
- AND the layout of surrounding Zone4 content is not disrupted

### REQ-003: CRM_OPERADOR_KPI_LIVE workflow contract

The `CRM_OPERADOR_KPI_LIVE` workflow MUST accept an `operator_id` and return a JSON object with: `calls_today`, `ventas_hoy`, `tasa_conversion` (percentage), `duracion_media` (seconds), and `refreshed_at` (ISO timestamp).

#### Scenario: CRM_OPERADOR_KPI_LIVE returns valid KPI payload

- GIVEN `CRM_OPERADOR_KPI_LIVE` is triggered with `operator_id`
- WHEN the workflow executes
- THEN it returns `{ calls_today: number, ventas_hoy: number, tasa_conversion: number, duracion_media: number, refreshed_at: string }`
- AND `tasa_conversion` is a percentage (0–100)
- AND `duracion_media` is in seconds

#### Scenario: CRM_OPERADOR_KPI_LIVE handles operator with no calls today

- GIVEN `CRM_OPERADOR_KPI_LIVE` is triggered for an operator with zero calls today
- WHEN the workflow executes
- THEN it returns `calls_today: 0, ventas_hoy: 0, tasa_conversion: 0, duracion_media: 0`
- AND the KPI strip renders zeros without error

### REQ-004: No performance regression on useOperatorData

The KPI refresh MUST NOT degrade the performance of the existing `useOperatorData` hook or cause double-fetching of lead data.

#### Scenario: KPI strip does not interfere with lead assignment data

- GIVEN `OperatorDashboard` has both the KPI strip and lead assignment active
- WHEN both fetch data simultaneously
- THEN the lead list loads within its normal time range
- AND the KPI strip loads independently without blocking lead data

## Out of Scope

- Historical KPI charts (future work)
- Exporting KPI data to CSV
- Changing the 30-second refresh interval via UI (future enhancement)
- `useOperatorData` migration to React Query (covered by S06)
- Callback management panel (covered by S05)

## Dependencies

- S04: none (Area B foundational — no upstream dependencies per proposal)

## Acceptance Criteria

- [ ] Zone4 shows 4 KPI cards with correct labels
- [ ] KPI data refreshes every 30 seconds via `useN8nQuery`
- [ ] Loading state uses skeleton screen (not spinner)
- [ ] `CRM_OPERADOR_KPI_LIVE` returns correct schema
- [ ] `calls_today` matches the operator's actual calls for today within 5%
- [ ] No performance regression on existing `useOperatorData` hook
- [ ] Zero calls today renders correctly without errors
- [ ] Navy Industrial style (`rounded-sm`, JetBrains Mono for numbers, no inline styles)

### REQ-005: MisKpiStrip component split

The `MisKpiStrip` component (158 LOC) MUST be refactored into `MisKpiStrip.jsx` (≤150 LOC) plus `useKpiStripLogic.js` (custom hook). The public API (props, events, data contract with `CRM_OPERADOR_KPI_LIVE`) remains unchanged.

#### Scenario: MisKpiStrip split preserves all existing behavior

- GIVEN `MisKpiStrip` is refactored into component + hook
- WHEN the refactored component renders in Zone4 of `OperatorDashboard`
- THEN all existing behavior is preserved (KPI display, 30s refresh, skeleton, stale indicator)
- AND 14 existing E2E specs continue to pass without modification
