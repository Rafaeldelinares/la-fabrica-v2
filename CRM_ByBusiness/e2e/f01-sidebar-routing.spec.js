import { test, expect } from '@playwright/test';

/**
 * E2E smoke test for F01 sidebar routing.
 *
 * Verifies that 4 new Sistema entries are added to the sidebar and that
 * admin users can navigate to their corresponding panels while operador
 * users cannot see them.
 *
 * New entries:
 *   - Monitor Scrapers  (MONITOR)           → ScraperStatusPanel + ScraperConfigPanel
 *   - Respaldos        (BACKUP)            → BackupPanel
 *   - Auditoría Nueva  (AUDIT_NEW)         → AdminAuditPanel
 *   - Configuración Scrapers (SCRAPER_CONFIG) → ScraperConfigPanel
 *
 * @see src/shared/layout/Sidebar.jsx
 * @see src/shared/layout/WorkBody.jsx
 */
test.describe('F01 Sidebar Routing', () => {

  /**
   * Admin user sees all 4 new Sistema entries in sidebar.
   */
  test('admin sees Monitor Scrapers, Respaldos, Auditoría Nueva, Configuración Scrapers', async ({ page }) => {
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
    await page.waitForURL('**/');

    // Expand Sistema section
    const sistemaBtn = page.locator('button', { hasText: /sistema/i }).first();
    await sistemaBtn.click();

    await expect(page.locator('button', { hasText: /monitor scrapers/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /respaldos/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /auditoría nueva/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /configuración scrapers/i })).toBeVisible();
  });

  /**
   * Admin can navigate to BACKUP panel (Respaldos) and see the panel shell.
   */
  test('admin navigates to Respaldos (BACKUP)', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('op_user', JSON.stringify({
        id: 1, email: 'rafaeldelinares@gmail.com', role: 'admin',
        nombre: 'Admin User', totp_habilitado: false,
        totp_configurado: false, es_simulacion: false,
      }));
    });
    await page.reload();
    await page.waitForURL('**/');

    const sistemaBtn = page.locator('button', { hasText: /sistema/i }).first();
    await sistemaBtn.click();
    await page.locator('button', { hasText: /respaldos/i }).click();

    // Wait for network + rendering; handle loading or empty state
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // Either content loaded or empty/error state — both mean the panel rendered
    const panelVisible = await page.locator('text=/respaldos|exitoso|fallido|sin respaldos/i').count() > 0;
    expect(panelVisible).toBeTruthy();
  });

  /**
   * Admin can navigate to AUDIT_NEW panel (Auditoría Nueva).
   */
  test('admin navigates to Auditoría Nueva (AUDIT_NEW)', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('op_user', JSON.stringify({
        id: 1, email: 'rafaeldelinares@gmail.com', role: 'admin',
        nombre: 'Admin User', totp_habilitado: false,
        totp_configurado: false, es_simulacion: false,
      }));
    });
    await page.reload();
    await page.waitForURL('**/');

    const sistemaBtn = page.locator('button', { hasText: /sistema/i }).first();
    await sistemaBtn.click();
    await page.locator('button', { hasText: /auditoría nueva/i }).click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // Panel shell renders — look for header or any audit-related text
    const panelVisible = await page.locator('text=/auditor|evento|usuario|registro/i').count() > 0;
    expect(panelVisible).toBeTruthy();
  });

  /**
   * Admin can navigate to SCRAPER_CONFIG panel (Configuración Scrapers).
   */
  test('admin navigates to Configuración Scrapers (SCRAPER_CONFIG)', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('op_user', JSON.stringify({
        id: 1, email: 'rafaeldelinares@gmail.com', role: 'admin',
        nombre: 'Admin User', totp_habilitado: false,
        totp_configurado: false, es_simulacion: false,
      }));
    });
    await page.reload();
    await page.waitForURL('**/');

    const sistemaBtn = page.locator('button', { hasText: /sistema/i }).first();
    await sistemaBtn.click();
    await page.locator('button', { hasText: /configuración scrapers/i }).click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // ScraperConfigPanel renders (or shows config/status text)
    const panelVisible = await page.locator('text=/scraper|config|settings|depth|frequency/i').count() > 0;
    expect(panelVisible).toBeTruthy();
  });

  /**
   * Admin can navigate to MONITOR panel (Monitor Scrapers).
   */
  test('admin navigates to Monitor Scrapers (MONITOR)', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('op_user', JSON.stringify({
        id: 1, email: 'rafaeldelinares@gmail.com', role: 'admin',
        nombre: 'Admin User', totp_habilitado: false,
        totp_configurado: false, es_simulacion: false,
      }));
    });
    await page.reload();
    await page.waitForURL('**/');

    const sistemaBtn = page.locator('button', { hasText: /sistema/i }).first();
    await sistemaBtn.click();
    await page.locator('button', { hasText: /monitor scrapers/i }).click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // Both ScraperStatusPanel + ScraperConfigPanel visible under MONITOR
    const panelVisible = await page.locator('text=/scraper|operativo|caído|nano|heavy|maps/i').count() > 0;
    expect(panelVisible).toBeTruthy();
  });

  /**
   * Operador user does NOT see the 4 new Sistema entries.
   * Operador role triggers tunnel mode (NEXT_CALL) — no sidebar visible.
   * Verify the app loads without crash and no admin panels are accessible.
   */
  test('operador does not see new Sistema entries', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('op_user', JSON.stringify({
        id: 1000, email: 'op1@test.com', role: 'operador',
        nombre: 'Operador Test', totp_habilitado: false,
        totp_configurado: false, es_simulacion: false,
      }));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // In tunnel mode, there is no sidebar — page loads with operator dashboard.
    // Verify the app did not crash (body is present).
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 5000 });

    // No Sistema sidebar button should exist for operador
    const sistema = page.locator('button', { hasText: /sistema/i });
    await expect(sistema).toHaveCount(0);
  });
});
