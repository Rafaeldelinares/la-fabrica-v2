import { test, expect } from '@playwright/test';

/**
 * E2E smoke test for S01 — stale-phase-label-cleanup.
 *
 * Verifies that no "Fase X" labels appear in GbpPanel after the stale phase
 * label cleanup. The hardcoded "Fase 9" badge was replaced by a descriptive
 * "Solo lectura" status badge.
 *
 * Auth pattern: localStorage bypass (same as agenda.spec.js, rbac.spec.js).
 *
 * @see openspec/changes/crm-3-areas-improvements/specs/stale-phase-label-cleanup/spec.md
 */
test.describe('S01: stale-phase-label-cleanup', () => {

  /**
   * Shared login helper — sets admin session in localStorage and waits for
   * the dashboard to be ready. Reusable across all S0x specs.
   *
   * Pattern copied from agenda.spec.js (loginAsAdmin) and rbac.spec.js.
   */
  async function loginAsAdmin(page) {
    await page.goto('/');

    // Set admin session in localStorage before the page fully renders.
    // AuthProvider reads op_user via lazy state initializer on mount.
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

    // Reload so AuthProvider re-initializes from the freshly set localStorage.
    await page.reload();

    // Wait for the sidebar nav to be present and visible.
    // The sidebar nav lives inside the fixed sidebar div rendered by WorkBody.
    // Use networkidle to ensure React has hydrated and the auth state is settled.
    await page.waitForLoadState('networkidle');

    // Verify the admin dashboard is showing (sidebar has "Negocio / Cartera" category).
    const negCategory = page.locator('text=Negocio / Cartera');
    await expect(negCategory).toBeVisible({ timeout: 15000 });
  }

  /**
   * Navigate to GBP panel — clicks "Google Business" in the sidebar.
   * The sidebar starts collapsed (no category expanded); the handler expands
   * the correct category automatically via `expanded === 'NEGOCIO'` default.
   */
  async function navigateToGbpPanel(page) {
    // The "Google Business" button is inside the expanded NEGOCIO category.
    const gbpButton = page.locator('button:has-text("Google Business")');
    await gbpButton.click();

    // Wait for the GBP panel header to appear.
    // GbpPanel renders: <h2 className="...">Google Business</h2>
    const panelHeader = page.locator('h2:has-text("Google Business")');
    await expect(panelHeader).toBeVisible({ timeout: 10000 });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: No "Fase" labels in GbpPanel
  // ──────────────────────────────────────────────────────────────────────────
  test('GbpPanel has no Fase labels', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToGbpPanel(page);

    // Count any element matching "Fase <digit>" pattern.
    // After S01 cleanup, this count must be 0.
    const faseCount = await page.locator('text=/Fase\\s+\\d+/').count();
    expect(faseCount).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: "Solo lectura" badge is present (replacement for Fase label)
  // ──────────────────────────────────────────────────────────────────────────
  test('GbpPanel shows Solo lectura badge', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToGbpPanel(page);

    // The Badge component renders: <Badge status="default">Solo lectura</Badge>
    const soloLecturaBadge = page.locator('text=Solo lectura');
    await expect(soloLecturaBadge).toBeVisible({ timeout: 10000 });
  });
});
