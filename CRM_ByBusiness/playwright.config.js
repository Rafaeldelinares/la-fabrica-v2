import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for CRM ByBusiness.
 * @see https://playwright.dev/docs/test-configuration
 *
 * Multi-project setup:
 * - 'dockhand' project → localhost:3000 (Dockhand running instance)
 * - 'crm' project → localhost:5174 (Vite dev server via `npm run dev`)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'dockhand',
      testMatch: ['e2e/auth.spec.js', 'e2e/agenda.spec.js', 'e2e/rbac.spec.js'],
      use: {
        baseURL: 'http://localhost:3000',
        ...devices['Desktop Chrome'],
      },
      // No webServer needed — Dockhand runs on port 3000 via Docker
      // and is already running. Playwright connects directly.
    },
    {
      name: 'crm',
      testMatch: ['e2e/s01-stale-phase-label-cleanup.spec.js', 'e2e/s02-admin-error-boundaries.spec.js', 'e2e/s03-dev-eventos-shim.spec.js', 'e2e/s04-operator-live-kpis.spec.js', 'e2e/s05-lead-callbacks.spec.js', 'e2e/s06-react-query-operator-data.spec.js', 'e2e/s07-lead-freeze-list.spec.js', 'e2e/s08-admin-audit-trail.spec.js', 'e2e/s09-backup-operations.spec.js', 'e2e/s10-rbac-coverage.spec.js'],
      use: {
        baseURL: 'http://localhost:5174',
        ...devices['Desktop Chrome'],
      },
      webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5174',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
    },
  ],
});
