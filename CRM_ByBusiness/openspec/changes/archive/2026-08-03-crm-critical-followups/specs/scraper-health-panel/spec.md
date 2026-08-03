# Delta Spec: scraper-health-panel (F01 Sidebar)

## MODIFIED Requirements

### Requirement: REQ-00X: Sidebar navigation to ScraperStatusPanel

The system MUST provide a Sistema navigation entry "Monitor Scrapers" in `Sidebar.jsx` that routes to the `MONITOR` tab in `WorkBody.jsx`, guarded by RBAC permission `admin.system.config`.

(Previously: No sidebar requirement — ScraperStatusPanel was only accessible via direct URL or future navigation)

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
