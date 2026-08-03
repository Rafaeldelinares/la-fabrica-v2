# Spec: lead-freeze-list (S07)

## Purpose

Display a freeze list in `MisResultados` showing leads that are frozen due to "no_contesta" status, plus a manual unfreeze capability, and add an assignment tooltip to Zone1 showing campaign and priority attribution for each lead.

## Affected Components

- `src/components/dashboard/MisResultados.jsx` (new freeze list section)
- `src/components/dashboard/zones/Zone1Filters.jsx` (assignment tooltip)
- Workflow: `CRM_LEADS_FREEZED_LIST` (new — returns frozen leads)
- Workflow: `CRM_LEADS_DISPONIBLES` (extended payload — adds `asignado_por` fields)

## Requirements

### REQ-001: MisResultados displays frozen leads section

The `MisResultados` component MUST show a dedicated section listing all leads frozen due to "no_contesta" status, fetched via `CRM_LEADS_FREEZED_LIST`.

#### Scenario: Frozen leads section renders with leads

- GIVEN the operator has frozen leads
- WHEN `MisResultados` mounts
- THEN a "Leads Congelados" section appears in the panel
- AND each frozen lead shows: name, frozen date, reason ("No contesta"), and an "Descongelar" button

#### Scenario: No frozen leads shows empty state

- GIVEN the operator has no frozen leads
- WHEN the frozen leads section renders
- THEN the section is hidden or shows "Sin leads congelados"
- AND no empty-state spinner is shown

#### Scenario: Frozen leads refresh on panel focus

- GIVEN the "Leads Congelados" section is displayed
- WHEN the operator switches tabs and returns to `MisResultados`
- THEN the frozen leads list is refetched
- AND updated freeze status is reflected

### REQ-002: Operator can manually unfreeze a lead

The system MUST allow the operator to manually unfreeze a lead, removing the freeze period immediately.

#### Scenario: Operator clicks Descongelar

- GIVEN a frozen lead is displayed in `MisResultados`
- WHEN the operator clicks "Descongelar"
- THEN a confirmation dialog appears: "¿Descongelar este lead?"
- AND confirming calls `CRM_LEADS_FREEZED_LIST` unfreeze action (or a dedicated endpoint)
- AND the lead disappears from the frozen list
- AND a success notification is shown

#### Scenario: Unfreeze fails due to network error

- GIVEN the operator submitted an unfreeze request
- WHEN the request fails (network error)
- THEN an error notification is shown
- AND the lead remains in the frozen list
- AND no data inconsistency occurs

### REQ-003: Zone1 shows assignment attribution tooltip

The system MUST display a tooltip on lead assignment badges in Zone1 showing the campaign name, priority level, and source attribution.

#### Scenario: Hovering assignment badge shows tooltip

- GIVEN the operator is on `OperatorDashboard` Zone1
- WHEN they hover over a lead's assignment badge
- THEN a tooltip appears with: "Asignado por: {campaign_name}, prioridad: {priority}, fuente: {source}"
- AND the tooltip uses Navy Industrial styling

#### Scenario: Tooltip shows when no attribution data is available

- GIVEN a lead's attribution data is null or missing
- WHEN the operator hovers over the assignment badge
- THEN the tooltip shows "Asignado por: Sistema, prioridad: —"
- AND no error or blank tooltip is displayed

#### Scenario: Assignment data is included in CRM_LEADS_DISPONIBLES response

- GIVEN `CRM_LEADS_DISPONIBLES` is called
- WHEN the workflow returns lead data
- THEN each lead includes `asignado_por: { campaign: string, prioridad: string, fuente: string }` fields
- AND Zone1 components can render the tooltip without additional API calls

### REQ-004: CRM_LEADS_FREEZED_LIST workflow contract

The `CRM_LEADS_FREEZED_LIST` workflow MUST accept `{ operator_id: string, action?: 'list' | 'unfreeze', lead_id?: string }` and return `{ frozen_leads: Array<{ id, nombre, telefono, congelado_en, motivo }> }`.

#### Scenario: List action returns frozen leads

- GIVEN `CRM_LEADS_FREEZED_LIST` is called with `action: 'list'` and `operator_id`
- WHEN the workflow executes
- THEN it returns `{ frozen_leads: [...] }` with the schema above
- AND the list is scoped to the requesting operator

#### Scenario: Unfreeze action removes freeze

- GIVEN `CRM_LEADS_FREEZED_LIST` is called with `action: 'unfreeze'`, `lead_id`
- WHEN the workflow validates the lead belongs to the operator
- THEN it removes the freeze from the lead
- AND returns `{ success: true }`

## Out of Scope

- Automatic freeze logic (handled by existing `no_contesta` flow in n8n)
- Freeze duration configuration (future enhancement)
- Multi-operator freeze visibility (operators only see their own)
- P3 toggle modifications

## Dependencies

- S07 depends on S04 (Zone1Filters is part of the operator dashboard flow; S04 establishes the baseline)

## Acceptance Criteria

- [ ] "Leads Congelados" section added to `MisResultados`
- [ ] Frozen leads list shows: name, frozen date, reason, Descongelar button
- [ ] Manual unfreeze works with confirmation dialog
- [ ] Zone1 assignment badge shows tooltip with campaign + priority + source
- [ ] Tooltip handles null attribution gracefully
- [ ] `CRM_LEADS_DISPONIBLES` payload includes `asignado_por` fields
- [ ] `CRM_LEADS_FREEZED_LIST` returns correct schema
- [ ] No `console.log`, no inline styles, no spinners (skeleton only)
