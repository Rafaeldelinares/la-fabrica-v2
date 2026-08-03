# Spec: scraper-health-panel (S11)

## Purpose

Display a real-time scraper health panel in the admin area showing the last-run status, timestamp, and health state of the three scraper services (nano, heavy, maps), via a new `CRM_SCRAPER_HEALTH` n8n workflow. This is the dependency root for Area A (S12–S14 fan out from S11).

## Affected Components

- `src/modules/admin/scraper/ScraperStatusPanel.jsx` (new)
- `src/modules/admin/scraper/` (scraper admin directory)
- Workflow: `CRM_SCRAPER_HEALTH` (new — aggregates nano/heavy/maps health)

## Requirements

### REQ-001: ScraperStatusPanel displays health for all three scrapers

The `ScraperStatusPanel` MUST display health information for: nano scraper, heavy scraper, and maps scraper.

#### Scenario: All scrapers are healthy

- GIVEN all three scraper services are running
- WHEN `ScraperStatusPanel` loads
- THEN each scraper card shows: service name, last run timestamp, status badge ("Operativo"), and last successful run time

#### Scenario: One or more scrapers are down

- GIVEN nano scraper is DOWN
- WHEN `ScraperStatusPanel` loads
- THEN the nano scraper card shows "CAÍDO" status badge in red
- AND the last error or last failed run time is shown
- AND the other scraper cards remain unaffected

#### Scenario: ScraperStatusPanel shows loading skeleton

- GIVEN the scraper status is being fetched
- WHEN the panel renders
- THEN skeleton cards are shown (not spinners)
- AND the panel area is non-empty

#### Scenario: No health data available yet

- GIVEN no health data has been collected for any scraper
- WHEN `ScraperStatusPanel` loads
- THEN it shows "Sin datos disponibles — los scrapers aún no han ejecutado"
- AND no error is thrown

### REQ-002: ScraperStatusPanel auto-refreshes every 60 seconds

The scraper health panel MUST refresh automatically every 60 seconds.

#### Scenario: Health data auto-refreshes

- GIVEN `ScraperStatusPanel` has loaded initial data
- WHEN 60 seconds elapse without admin interaction
- THEN a background refetch is triggered
- AND status badges update if any scraper state has changed

#### Scenario: Stale data indicator after 2 minutes

- GIVEN health data has not refreshed for more than 2 minutes
- WHEN the panel is displayed
- THEN a "Datos puede no estar actualizados" indicator is shown
- AND the admin is aware the panel may be stale

### REQ-003: CRM_SCRAPER_HEALTH workflow contract

The `CRM_SCRAPER_HEALTH` workflow MUST aggregate health from nano/heavy/maps and return `{ scrapers: Array<{ name, status: 'up' | 'down' | 'unknown', last_run: string | null, last_error: string | null, last_success: string | null }>, refreshed_at: string }`.

#### Scenario: CRM_SCRAPER_HEALTH returns valid health data

- GIVEN `CRM_SCRAPER_HEALTH` is triggered
- WHEN it queries each scraper's health endpoint
- THEN it returns the aggregated JSON with the schema above
- AND `refreshed_at` is an ISO timestamp

#### Scenario: One scraper is unreachable

- GIVEN nano scraper is DOWN but heavy and maps are up
- WHEN `CRM_SCRAPER_HEALTH` runs
- THEN nano scraper has `status: 'down'` and `last_error` is populated
- AND heavy and maps scrapers have `status: 'up'`
- AND the workflow does not fail — it handles partial failures gracefully

#### Scenario: All scrapers unreachable (R1 mitigation)

- GIVEN all three scrapers are unreachable
- WHEN `CRM_SCRAPER_HEALTH` runs
- THEN it returns `status: 'unknown'` for each scraper
- AND it does NOT throw an error
- AND the panel shows "Servicio no disponible" for each scraper

### REQ-004: ScraperStatusPanel has admin-only access

The `ScraperStatusPanel` MUST be accessible only to users with `admin` role or `scraper.read` permission.

#### Scenario: Non-admin cannot access scraper panel

- GIVEN a non-admin user navigates to `ScraperStatusPanel`
- WHEN the component mounts
- THEN an access-denied message is shown
- AND no health data is fetched

## Out of Scope

- Scraper configuration (covered by S14)
- Triggering re-scrapes (covered by S13)
- Modifying scraper health endpoint behavior
- Backend changes to scraper infrastructure
- P3 toggle modifications

## Dependencies

- S11: none (per proposal — Area A dependency root; S12–S14 depend on S11)
- External dependency: scraper `/health` endpoint must exist (R1 risk — documented in proposal)

## Acceptance Criteria

- [ ] `ScraperStatusPanel` created in `src/modules/admin/scraper/`
- [ ] Panel shows health cards for nano, heavy, maps scrapers
- [ ] Status badge: "Operativo" (green/slate), "CAÍDO" (red #D00000), "Sin datos"
- [ ] Auto-refresh every 60 seconds
- [ ] Stale data indicator after 2 minutes
- [ ] All scrapers unreachable shows graceful "no data" state (not error)
- [ ] `CRM_SCRAPER_HEALTH` returns correct schema
- [ ] Admin-only access via RBAC
- [ ] No `console.log`, no inline styles, no spinners
- [ ] Navy Industrial style (`rounded-sm`, slate-950, #D00000 accent)

### REQ-005: Sidebar navigation to ScraperStatusPanel

The system MUST provide a Sistema navigation entry "Monitor Scrapers" in `Sidebar.jsx` that routes to the `MONITOR` tab in `WorkBody.jsx`, guarded by RBAC permission `admin.system.config`.

#### Scenario: Admin accesses ScraperStatusPanel via Sidebar

- GIVEN an admin user is authenticated and `Sidebar.jsx` is rendered
- WHEN the "Sistema" section is expanded and "Monitor Scrapers" is clicked
- THEN `WorkBody.jsx` routes to the `MONITOR` tab
- AND `ScraperStatusPanel` is rendered in the work area

#### Scenario: Non-admin user does not see Monitor Scrapers entry

- GIVEN a non-admin operator is authenticated
- WHEN `Sidebar.jsx` renders
- THEN the "Monitor Scrapers" entry is not visible in the Sistema section
- AND direct URL access to MONITOR tab returns access-denied
