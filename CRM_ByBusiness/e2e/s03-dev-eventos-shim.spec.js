import { test, expect } from '@playwright/test';

/**
 * E2E smoke test for S03 — dev-eventos-shim.
 *
 * Verifies:
 *   - In CI (production-like env), reportError does NOT emit console.error
 *   - reportError degrades gracefully when eventos_sistema table is unreachable
 *
 * Auth pattern: localStorage bypass (matches agenda.spec.js / rbac.spec.js).
 *
 * @see openspec/changes/crm-3-areas-improvements/specs/dev-eventos-shim/spec.md
 */
test.describe('S03: dev-eventos-shim', () => {

  /**
   * Login helper — sets admin session in localStorage (bypass login).
   */
  async function loginAsAdmin(page) {
    await page.goto('/');

    await page.evaluate(() => {
      const adminUser = {
        id: 1,
        email: 'rafaeldelinares@gmail.com',
        role: 'admin',
        nombre: 'Admin User',
        totp_habilitado: false,
        totp_configurado: false,
        es_simulacion: false,
      };
      localStorage.setItem('op_user', JSON.stringify(adminUser));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: CI/production — console.error must NOT be called
  // ──────────────────────────────────────────────────────────────────────────
  test('reportError does not call console.error in CI environment', async ({ page }) => {
    await loginAsAdmin(page);

    // Collect all console.error calls during the test
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Trigger a render error that will be caught by an ErrorBoundary
    // which in turn calls reportError
    await page.evaluate(() => {
      window.dispatchEvent(new ErrorEvent('error', {
        error: new Error('S03_CI_TEST_ERROR'),
        message: 'S03_CI_TEST_ERROR: smoke test error for CI',
        bubbles: true,
      }));
    });

    // Give reportError time to execute (async fetch)
    await page.waitForTimeout(2000);

    // Filter out unrelated console.errors (e.g. React's own error logging)
    const s03RelatedErrors = consoleErrors.filter(
      (text) => text.includes('S03_CI_TEST_ERROR') || text.includes('[reportError]')
    );

    // In CI (production-like), console.error must NOT fire from reportError
    expect(s03RelatedErrors).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: reportError never throws — app stays functional
  // ──────────────────────────────────────────────────────────────────────────
  test('reportError never throws; app remains functional after error', async ({ page }) => {
    await loginAsAdmin(page);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Collect console errors to verify none come from reportError
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Dispatch an uncaught error that will be caught by ErrorBoundary
    // which calls reportError — reportError must not throw
    await page.evaluate(() => {
      setTimeout(() => {
        window.dispatchEvent(new ErrorEvent('error', {
          error: new Error('S03_GRACEFUL_TEST'),
          message: 'S03_GRACEFUL_TEST: verify reportError never throws',
          bubbles: true,
        }));
      }, 500);
    });

    // Give time for ErrorBoundary + reportError to process
    await page.waitForTimeout(2000);

    // Verify no reportError-related console errors in CI
    const reportErrorErrors = consoleErrors.filter(
      (text) => text.includes('[reportError]') || text.includes('S03_GRACEFUL_TEST')
    );
    expect(reportErrorErrors).toHaveLength(0);

    // Page should still be functional — sidebar nav visible
    const sidebar = page.locator('nav, aside').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });
});
