# Delta Spec: scraper-config-panel (F01 Sidebar + F03 Split)

## MODIFIED Requirements

### Requirement: REQ-00X: Sidebar navigation to ScraperConfigPanel

The system MUST provide a Sistema navigation entry "Configuración Scrapers" in `Sidebar.jsx` that routes to the `SCRAPER_CONFIG` tab in `WorkBody.jsx`, guarded by RBAC permission `admin.system.config`.

(Previously: No sidebar requirement — ScraperConfigPanel was only accessible via direct URL or sibling navigation from ScraperStatusPanel)

#### Scenario: Admin accesses ScraperConfigPanel via Sidebar

- GIVEN an admin user is authenticated and `Sidebar.jsx` is rendered
- WHEN the "Sistema" section is expanded and "Configuración Scrapers" is clicked
- THEN `WorkBody.jsx` routes to the `SCRAPER_CONFIG` tab
- AND `ScraperConfigPanel` is rendered in the work area

#### Scenario: Non-admin user does not see Configuración Scrapers entry

- GIVEN a non-admin operator is authenticated
- WHEN `Sidebar.jsx` renders
- THEN the "Configuración Scrapers" entry is not visible in the Sistema section
- AND direct URL access to SCRAPER_CONFIG tab returns access-denied

### Requirement: REQ-00Y: ScraperConfigPanel component split

The `ScraperConfigPanel` component (335 LOC) MUST be refactored into `ScraperConfigPanel.jsx` (≤150 LOC) plus helper modules `useScraperConfig.js` (hook) and `scraperConfigHelpers.js` (utility functions). The public API (props, events, workflow calls) remains unchanged.

(Previously: Single monolithic `ScraperConfigPanel.jsx` at 335 LOC)

#### Scenario: ScraperConfigPanel split preserves all existing behavior

- GIVEN `ScraperConfigPanel` is refactored into component + helpers
- WHEN the refactored component renders with the same props
- THEN all existing behavior is preserved (display, config update, R7 fallback)
- AND 14 existing E2E specs continue to pass without modification
