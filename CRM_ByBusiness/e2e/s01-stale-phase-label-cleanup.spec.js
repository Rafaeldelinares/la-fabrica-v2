import { test, expect } from '@playwright/test';

/**
 * E2E smoke test for S01 — stale-phase-label-cleanup.
 *
 * Verifies that no "Fase X" labels appear in GbpPanel and landing components
 * after the stale phase label cleanup.
 *
 * @see openspec/changes/crm-3-areas-improvements/specs/stale-phase-label-cleanup/spec.md
 */
test.describe('S01: stale-phase-label-cleanup', () => {

  /**
   * GbpPanel must not render any "Fase" text in its header area.
   * This covers the removal of the hardcoded "Fase 9" badge replaced by a
   * descriptive "Solo lectura" status badge.
   */
  test('GbpPanel header has no Fase labels', async ({ page }) => {
    // Authenticate as admin and navigate to dashboard
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('op_user', JSON.stringify({
        id: 1,
        email: 'rafaeldelinares@gmail.com',
        role: 'admin',
        nombre: 'Admin User',
        totp_habilitado: false,
        totp_configurado: false,
        es_simulacion: false,
      }));
    });
    await page.reload();

    // Wait for the sidebar nav to be ready
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });

    // Click "Google Business" in the sidebar
    await page.locator('button:has-text("Google Business")').click();

    // Wait for the panel header to be visible
    await expect(page.locator('h2:has-text("Google Business")')).toBeVisible({ timeout: 10000 });

    // Verify no "Fase" text appears anywhere in the panel
    const faseCount = await page.locator('text=/Fase\\s+\\d+/').count();
    expect(faseCount).toBe(0);
  });

  /**
   * Verify the GbpPanel header renders the descriptive "Solo lectura" badge
   * instead of a numeric phase label.
   */
  test('GbpPanel shows Solo lectura status badge', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('op_user', JSON.stringify({
        id: 1,
        email: 'rafaeldelinares@gmail.com',
        role: 'admin',
        nombre: 'Admin User',
        totp_habilitado: false,
        totp_configurado: false,
        es_simulacion: false,
      }));
    });
    await page.reload();

    // Wait for sidebar
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });

    // Click "Google Business" in the sidebar
    await page.locator('button:has-text("Google Business")').click();

    // Verify the "Solo lectura" badge is visible
    await expect(page.locator('text=Solo lectura')).toBeVisible({ timeout: 10000 });
  });
});
