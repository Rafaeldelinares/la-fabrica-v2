# Spec: scraper-config-panel (S14)

## Purpose

Provide administrators with a `ScraperConfigPanel` to view and update scraper operational parameters (depth, frequency, localities, categories) via new `CRM_SCRAPER_CONFIG_GET` and `CRM_SCRAPER_CONFIG_UPDATE` workflows. If the scraper config API is not yet exposed (R7 risk), the panel shows "Configuración via variables de entorno" and is disabled.

## Affected Components

- `src/modules/admin/scraper/ScraperConfigPanel.jsx` (new)
- `src/modules/admin/scraper/ScraperStatusPanel.jsx` (S11 — co-located)
- Workflow: `CRM_SCRAPER_CONFIG_GET` (new — read current config)
- Workflow: `CRM_SCRAPER_CONFIG_UPDATE` (new — write config changes)

## Requirements

### REQ-001: ScraperConfigPanel displays current scraper configuration

The `ScraperConfigPanel` MUST display the current scraper parameters: depth, frequency, localities list, excluded categories.

#### Scenario: Config is available and panel shows editable fields

- GIVEN scraper config is accessible via the config API
- WHEN `ScraperConfigPanel` loads
- THEN it displays all configurable fields: depth (number), frequency (schedule), localities (list), excluded categories (list)
- AND each field is editable
- AND a "Guardar cambios" button is shown

#### Scenario: Config API is not available (R7 fallback)

- GIVEN the scraper config API is not yet exposed
- WHEN `ScraperConfigPanel` loads
- THEN it shows a disabled state: "Configuración via variables de entorno"
- AND no editable fields are shown
- AND no API calls are made

#### Scenario: Config load fails gracefully

- GIVEN `CRM_SCRAPER_CONFIG_GET` returns an error
- WHEN `ScraperConfigPanel` loads
- THEN it shows "No se pudo cargar la configuración"
- AND no error is thrown to the admin

### REQ-002: Admin can update scraper configuration

The system MUST allow admins to update scraper parameters via `ScraperConfig_UPDATE`.

#### Scenario: Admin saves configuration changes

- GIVEN an admin has modified scraper parameters in `ScraperConfigPanel`
- WHEN they click "Guardar cambios"
- THEN a confirmation dialog appears: "¿Guardar cambios de configuración?"
- AND confirming calls `CRM_SCRAPER_CONFIG_UPDATE` with the updated fields
- AND a success notification confirms the save
- AND the panel reflects the new values

#### Scenario: Config update fails

- GIVEN an admin submitted config changes
- WHEN `CRM_SCRAPER_CONFIG_UPDATE` returns an error
- THEN an error notification is shown
- AND the panel retains the pre-save values

#### Scenario: Config update requires admin role

- GIVEN a non-admin user navigates to `ScraperConfigPanel`
- WHEN they attempt to save changes
- THEN the request is rejected with 403
- AND an error notification is shown

### REQ-003: CRM_SCRAPER_CONFIG_GET workflow contract

The `CRM_SCRAPER_CONFIG_GET` workflow MUST accept no parameters and return `{ depth: number, frequency: string, localities: string[], excluded_categories: string[], updated_at: string }` or `{ available: false, reason: string }` if the API is not exposed.

#### Scenario: Returns current config

- GIVEN `CRM_SCRAPER_CONFIG_GET` is called
- WHEN the scraper config API is reachable
- THEN it returns `{ depth, frequency, localities, excluded_categories, updated_at }`

#### Scenario: Config API not exposed

- GIVEN `CRM_SCRAPER_CONFIG_GET` cannot reach the scraper config API
- WHEN the workflow runs
- THEN it returns `{ available: false, reason: 'Configuración via variables de entorno' }`
- AND the panel renders in disabled state

### REQ-004: CRM_SCRAPER_CONFIG_UPDATE workflow contract

The `CRM_SCRAPER_CONFIG_UPDATE` workflow MUST accept `{ depth?: number, frequency?: string, localities?: string[], excluded_categories?: string[] }` and return `{ success: boolean, config: object, error?: string }`.

#### Scenario: Update succeeds

- GIVEN `CRM_SCRAPER_CONFIG_UPDATE` is called with valid parameters
- WHEN the workflow validates and persists the config
- THEN it returns `{ success: true, config: { depth, frequency, localities, excluded_categories, updated_at } }`

#### Scenario: Update with invalid parameters

- GIVEN `CRM_SCRAPER_CONFIG_UPDATE` is called with invalid values (e.g., depth = -1)
- WHEN the workflow validates input
- THEN it returns `{ success: false, error: 'Parámetro inválido: depth debe ser positivo' }`

## Out of Scope

- Direct scraper service modification (must go through config API)
- Scheduling complex cron expressions (frequency is simple interval for this slice)
- Per-scraper individual configs (nano vs heavy vs maps — future enhancement)
- P3 toggle modifications

## Dependencies

- S14 depends on S11 (scraper health panel must be available as the sibling panel)

## Acceptance Criteria

- [ ] `ScraperConfigPanel` created in `src/modules/admin/scraper/`
- [ ] Panel shows all scraper config parameters when API is available
- [ ] "Configuración via variables de entorno" shown when API not available (R7 fallback)
- [ ] Config update requires admin role
- [ ] Confirmation dialog before saving changes
- [ ] `CRM_SCRAPER_CONFIG_GET` and `CRM_SCRAPER_CONFIG_UPDATE` return correct schemas
- [ ] No `console.log`, no inline styles, no spinners
- [ ] Navy Industrial style (`rounded-sm`, slate-950, #D00000 for critical actions)
- [ ] E2E smoke spec: admin views config panel
