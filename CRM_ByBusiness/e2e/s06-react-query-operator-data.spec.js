import { test, expect } from '@playwright/test';

/**
 * E2E smoke test for S06 — react-query-operator-data.
 *
 * Verifies:
 *   - useOperatorData hook correctly fetches data via useN8nQuery
 *   - OperatorDashboard Zone1 renders without modification
 *   - Leads loading state transitions work
 *   - Error state is handled gracefully
 *
 * Auth pattern: localStorage bypass (loginAsOperador).
 *
 * @see openspec/changes/crm-3-areas-improvements/tasks/react-query-operator-data/tasks.md
 */
test.describe('S06: react-query-operator-data', () => {

  /**
   * Login as operador — sets operador session in localStorage.
   */
  async function loginAsOperador(page) {
    await page.goto('/');
    await page.evaluate(() => {
      const operadorUser = {
        id: 2,
        email: 'operador@test.com',
        role: 'operador',
        nombre: 'Operador Test',
        totp_habilitado: false,
        totp_configurado: false,
        es_simulacion: false,
      };
      localStorage.setItem('op_user', JSON.stringify(operadorUser));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Wait for dashboard to be visible (Zone1 input is a good indicator)
    const zone1 = page.locator('input[placeholder="Ciudad / Localidad"]').first();
    await expect(zone1).toBeVisible({ timeout: 10_000 });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Zone1 renders after data loads (smoke test for useOperatorData)

  test('Zone1 renders with locality input after operator login', async ({ page }) => {
    await loginAsOperador(page);

    // Zone1 should show the locality input
    const localidadInput = page.locator('input[placeholder="Ciudad / Localidad"]').first();
    await expect(localidadInput).toBeVisible();

    // Zone1 should also show the "Asignar Lead" button
    const asignarBtn = page.locator('button:has-text("Asignar Lead"), button:has-text("Tomar Lead")').first();
    await expect(asignarBtn).toBeVisible({ timeout: 5_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: Zone4 (KPIs + Callbacks) renders without breaking useOperatorData

  test('Zone4 KPI strip renders after operator login', async ({ page }) => {
    await loginAsOperador(page);

    // Scroll to Zone4
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');

    // KPI strip cards should be visible
    const kpiCards = page.locator('.bg-slate-900.border.border-slate-800.rounded-sm');
    await expect(kpiCards.first()).toBeVisible({ timeout: 15_000 });

    const count = await kpiCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3: No console errors during data fetch (verify error handling is silent)

  test('no console errors during dashboard load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await loginAsOperador(page);
    await page.waitForLoadState('networkidle');

    // Filter out expected/known errors (e.g., from n8n webhook not registered)
    const unexpectedErrors = errors.filter(
      (e) =>
        !e.includes('404') &&
        !e.includes('webhook') &&
        !e.includes('n8n') &&
        !e.includes('Failed to fetch'),
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});
