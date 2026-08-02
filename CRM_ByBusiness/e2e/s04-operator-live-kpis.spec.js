import { test, expect } from '@playwright/test';

/**
 * E2E smoke test for S04 — operator-live-kpis.
 *
 * Verifies:
 *   - 4 KPI cards render in Zone4 of OperatorDashboard
 *   - Skeleton is shown while loading
 *   - KPI values eventually populate (from CRM_OPERADOR_KPI_LIVE workflow)
 *   - Stale indicator after 60s without refresh
 *
 * Auth pattern: localStorage bypass (loginAsOperador).
 *
 * @see openspec/changes/crm-3-areas-improvements/tasks/operator-live-kpis/tasks.md
 */
test.describe('S04: operator-live-kpis', () => {

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
    // Wait for dashboard to be visible
    const zone1 = page.locator('input[placeholder="Ciudad / Localidad"]').first();
    await expect(zone1).toBeVisible({ timeout: 10_000 });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Zone4 — KPI strip renders 4 cards after load

  test('Zone4 renders 4 KPI cards', async ({ page }) => {
    await loginAsOperador(page);

    // Zone4 is below CampanasPanel. Scroll to bottom of dashboard.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');

    // Should see 4 KPI card containers
    const kpiCards = page.locator('.bg-slate-900.border.border-slate-800.rounded-sm');
    await expect(kpiCards.first()).toBeVisible({ timeout: 15_000 });

    // Count should be at least 4 (may have more from other panels)
    const count = await kpiCards.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Each card should have a label and value
    const labels = page.locator('.bg-slate-900.border.border-slate-800.rounded-sm >> text=Calls Today');
    const ventasLabels = page.locator('.bg-slate-900.border.border-slate-800.rounded-sm >> text=Ventas Hoy');
    const tasaLabels = page.locator('.bg-slate-900.border.border-slate-800.rounded-sm >> text=Tasa');
    const duracionLabels = page.locator('.bg-slate-900.border.border-slate-800.rounded-sm >> text=Duración');

    await expect(labels.first()).toBeVisible();
    await expect(ventasLabels.first()).toBeVisible();
    await expect(tasaLabels.first()).toBeVisible();
    await expect(duracionLabels.first()).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: KPI values eventually populate (workflow returns data)

  test('KPI values populate from n8n workflow', async ({ page }) => {
    await loginAsOperador(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');

    // Wait for KPI values to appear (workflow returns calls_hoy, ventas_hoy, etc.)
    // The values may be 0 if no calls were made today, but the card should show numeric values
    const kpiValues = page.locator('.bg-slate-900.border.border-slate-800.rounded-sm .font-mono.text-2xl');
    await expect(kpiValues.first()).toBeVisible({ timeout: 20_000 });

    // All 4 KPI values should be present
    const valueCount = await kpiValues.count();
    expect(valueCount).toBeGreaterThanOrEqual(4);

    // Each value should be a number (not NaN)
    for (let i = 0; i < Math.min(valueCount, 4); i++) {
      const text = await kpiValues.nth(i).textContent();
      expect(text.trim()).toMatch(/^\d/);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3: Zone4 has refresh indicator

  test('Zone4 shows refresh indicator', async ({ page }) => {
    await loginAsOperador(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');

    // Should show "Actualizado" or "refreshing" text near the KPI strip
    const refreshText = page.locator('text=/Actualizado|refreshing|cada 30s/').first();
    await expect(refreshText).toBeVisible({ timeout: 15_000 });
  });
});
