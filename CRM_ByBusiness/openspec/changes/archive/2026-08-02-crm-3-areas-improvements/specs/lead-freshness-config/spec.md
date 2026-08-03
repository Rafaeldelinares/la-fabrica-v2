# Spec: lead-freshness-config (S13)

## Purpose

Provide an admin UI to configure the lead contactability threshold (currently 90-day hardcoded) and add a "Forzar rescrape" button in the GBP tab of `ClienteDrawer` to manually trigger a re-scrape of a lead's GBP data.

## Affected Components

- `src/modules/admin/agenda/AgendaGlobalPanel.jsx` (freshness config field — existing panel)
- `src/modules/admin/leads/ClienteDrawer.jsx` (new "Forzar rescrape" button in GBP tab)
- Workflow: `CRM_GBP_RESCRAPE` (new — triggers manual re-scrape)
- Workflow: `CRM_LEAD_FRESHNESS_CONFIG` (new — get/set freshness threshold)

## Requirements

### REQ-001: Freshness threshold is configurable via UI

The system MUST provide an admin-configurable freshness threshold field in `AgendaGlobalPanel` (or a dedicated section).

#### Scenario: Admin views current freshness threshold

- GIVEN an admin navigates to the agenda/freshness config area
- WHEN the panel loads
- THEN the current threshold is shown (default: 90 days)
- AND a numeric input field allows editing

#### Scenario: Admin changes freshness threshold

- GIVEN an admin has modified the freshness threshold value
- WHEN they click "Guardar"
- THEN `CRM_LEAD_FRESHNESS_CONFIG` is called with `action: 'update'` and the new value
- AND a success notification confirms the change
- AND subsequent lead assignment queries use the new threshold

#### Scenario: Freshness threshold update fails

- GIVEN an admin submitted a threshold change
- WHEN `CRM_LEAD_FRESHNESS_CONFIG` returns an error
- THEN an error notification is shown
- AND the previous value remains in effect

### REQ-002: Forzar rescrape button in ClienteDrawer GBP tab

The `ClienteDrawer` GBP tab MUST include a "Forzar rescrape" button that POSTs to `CRM_GBP_RESCRAPE`.

#### Scenario: Admin clicks Forzar rescrape

- GIVEN an admin is viewing the GBP tab of `ClienteDrawer` for a lead with a `place_id`
- WHEN they click "Forzar rescrape"
- THEN a confirmation dialog appears: "¿Forzar rescrape de este negocio?"
- AND confirming calls `CRM_GBP_RESCRAPE` with `place_id`
- AND a success notification confirms the rescrape was triggered

#### Scenario: Rescrape fails for lead without place_id

- GIVEN an admin is viewing `ClienteDrawer` for a lead without a `place_id`
- WHEN they attempt to click "Forzar rescrape"
- THEN the button is disabled or hidden
- AND no error is thrown

#### Scenario: Rescrape returns an error

- GIVEN an admin submitted a rescrape request
- WHEN `CRM_GBP_RESCRAPE` returns an error (e.g., scraper unavailable)
- THEN an error notification is shown
- AND no partial state is left

### REQ-003: CRM_GBP_RESCRAPE workflow contract

The `CRM_GBP_RESCRAPE` workflow MUST accept `{ place_id: string, lead_id?: string }` and return `{ success: boolean, job_id?: string, error?: string }`.

#### Scenario: Rescrape triggered successfully

- GIVEN `CRM_GBP_RESCRAPE` is called with a valid `place_id`
- WHEN the workflow queues the scrape job
- THEN it returns `{ success: true, job_id: '...' }`
- AND the operator/admin can optionally track job status via `job_id`

#### Scenario: Rescrape for unknown place_id

- GIVEN `CRM_GBP_RESCRAPE` is called with an unknown `place_id`
- WHEN the workflow validates the input
- THEN it returns `{ success: false, error: 'place_id no encontrado' }`

### REQ-004: CRM_LEAD_FRESHNESS_CONFIG workflow contract

The `CRM_LEAD_FRESHNESS_CONFIG` workflow MUST accept `{ action: 'get' | 'update', value?: number }` and return `{ value: number, updated_at: string }` for both actions (on update, returns updated value).

#### Scenario: Get current freshness config

- GIVEN `CRM_LEAD_FRESHNESS_CONFIG` is called with `action: 'get'`
- WHEN it queries `sistema.configuracion`
- THEN it returns `{ value: 90, updated_at: '...' }`

#### Scenario: Update freshness config

- GIVEN `CRM_LEAD_FRESHNESS_CONFIG` is called with `action: 'update'` and `value: 30`
- WHEN it stores the new value in `sistema.configuracion`
- THEN it returns `{ value: 30, updated_at: '...' }`
- AND the DB function `crm.asignar_lead` will read the new threshold in a future change (R3 from proposal — DB function update is out-of-scope for this slice)

### REQ-005: Freshness config persisted in sistema.configuracion

The system MUST store the freshness threshold in `sistema.configuracion` (not in code or environment variables), enabling runtime changes without deployment.

#### Scenario: Config persists across sessions

- GIVEN a freshness threshold has been set to 30 days
- WHEN the admin navigates away and returns later
- THEN the displayed threshold is 30 days
- AND the value is read from `sistema.configuracion`, not from a hardcoded constant

## Out of Scope

- DB function update to `crm.asignar_lead` (R3 mitigation — deferred to follow-up change)
- Scraping frequency configuration (covered by S14)
- Multi-threshold configurations (e.g., different thresholds per campaign)
- P3 toggle modifications

## Dependencies

- S13 depends on S11 (Area A fan-out — scraper health must be available before rescrape can be triggered)

## Acceptance Criteria

- [ ] Freshness threshold field in `AgendaGlobalPanel` (or dedicated section)
- [ ] Threshold saved to `sistema.configuracion` via `CRM_LEAD_FRESHNESS_CONFIG`
- [ ] "Forzar rescrape" button added to `ClienteDrawer` GBP tab
- [ ] Button disabled for leads without `place_id`
- [ ] Confirmation dialog before rescrape
- [ ] `CRM_GBP_RESCRAPE` and `CRM_LEAD_FRESHNESS_CONFIG` return correct schemas
- [ ] Config persists across sessions
- [ ] No `console.log`, no inline styles, no spinners
- [ ] Navy Industrial style
