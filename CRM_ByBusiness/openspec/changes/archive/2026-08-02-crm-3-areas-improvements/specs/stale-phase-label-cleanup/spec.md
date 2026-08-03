# Spec: stale-phase-label-cleanup (S01)

## Purpose

Remove meaningless "Fase X" labels from `GbpPanel` and landing components and replace them with meaningful status badges that convey actual workflow state to operators.

## Affected Components

- `src/modules/admin/gbp/GbpPanel.jsx`
- Landing page components showing "Fase 9" / "Fase 3" labels
- `src/components/dashboard/zones/` (any zone showing phase labels)

## Requirements

### REQ-001: Remove stale phase labels from GbpPanel

The system MUST remove hardcoded "Fase 9" and "Fase 3" labels from `GbpPanel.jsx` and replace them with status badges that reflect the actual panel mode (readonly GBP listing, ficha detail, etc.).

#### Scenario: GbpPanel renders without stale labels

- GIVEN the operator is on the GBP management screen
- WHEN the component mounts
- THEN no "Fase X" label is rendered anywhere in the panel
- AND any status indicator uses a meaningful badge (e.g., "Solo lectura", "Gestión activa")

#### Scenario: GbpPanel shows meaningful status for read-only mode

- GIVEN the operator has read-only access to GBP data
- WHEN the panel renders
- THEN a status badge shows "Solo lectura" with appropriate styling
- AND no numeric phase label appears

### REQ-002: Remove stale phase labels from landing page

The system MUST remove "Fase X" labels from any landing page or entry-point component that displays them.

#### Scenario: Landing page loads without phase labels

- GIVEN the operator navigates to the CRM entry point
- WHEN the landing page renders
- THEN no "Fase X" labels are visible
- AND navigation elements show descriptive text or icons instead

### REQ-003: No phase labels elsewhere in admin UI

The system MUST NOT display numeric "Fase X" labels anywhere in the admin UI components listed in the Affected Components section.

#### Scenario: No phase labels in any Zone component

- GIVEN any Zone component (`zones/`) is rendered
- WHEN it contains a status indicator
- THEN that indicator uses descriptive text, not numeric phases
- AND any remaining "Fase" text references are verified as intentional (e.g., help text explaining a workflow step)

## Out of Scope

- P3 toggles (`gbp_snapshot`, `gbp_autorepair`) — explicitly not touched
- Backend DB changes or workflow modifications
- RBAC logic changes
- Multi-tab or multi-component navigation state changes

## Dependencies

None (S01 has no dependencies per the proposal slice plan).

## Acceptance Criteria

- [ ] "Fase 9" / "Fase 3" labels removed from `GbpPanel.jsx`
- [ ] Any landing page components no longer show numeric phase labels
- [ ] New status badges use Navy Industrial style (`rounded-sm`, slate-950 tones)
- [ ] No inline styles introduced
- [ ] E2E smoke spec confirms no "Fase" text in these components
