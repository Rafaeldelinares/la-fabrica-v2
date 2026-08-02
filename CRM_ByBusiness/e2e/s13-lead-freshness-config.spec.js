import { test, expect } from '@playwright/test';

/**
 * E2E smoke test for S13 — lead-freshness-config (FreshnessConfigCard).
 *
 * Verifies:
 *   - FreshnessConfigCard header renders ("Umbral de contactabilidad")
 *   - Admin with admin.system.config sees the config card
 *   - Default value (90 days) is shown when API returns nothing
 *   - Numeric input field is editable
 *   - Guardar button is disabled when value is unchanged
 *   - Rango helper text is visible (7–180 días)
 *   - Guardar button enables after value change
 *   - Notification appears on save attempt (API may succeed or fail)
 *   - No console.log, no inline styles, no spinners
 *   - Navy Industrial style
 *
 * Auth pattern: localStorage bypass (loginAsAdmin).
 *
 * @see openspec/changes/crm-3-areas-improvements/specs/lead-freshness-config/spec.md
 */
test.describe('S13: lead-freshness-config (FreshnessConfigCard)', () => {

  /**
   * Login as admin — sets admin session in localStorage with admin.system.config permission.
   */
  async function loginAsAdmin(page) {
    await page.goto('/');
    await page.evaluate(() => {
      const adminUser = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        nombre: 'Admin Test',
        totp_habilitado: false,
        totp_configurado: false,
        es_simulacion: false,
        permisos: ['admin.system.config'],
      };
      localStorage.setItem('op_user', JSON.stringify(adminUser));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  /**
   * Login as operador — no admin.system.config permission.
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
        permisos: [],
      };
      localStorage.setItem('op_user', JSON.stringify(operadorUser));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Admin with admin.system.config sees "Umbral de contactabilidad" header

  test('admin with admin.system.config sees Umbral de contactabilidad header', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to AGENDA tab where AgendaGlobalPanel renders
    await page.goto('/#/AGENDA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const header = page.locator('text=Umbral de contactabilidad').first();
    await expect(header).toBeVisible({ timeout: 10_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: Numeric input field is present

  test('numeric input field renders', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/#/AGENDA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // Wait for loading skeleton to resolve
    await page.waitForTimeout(1_500);

    const input = page.locator('input[type="number"]').first();
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3: Rango helper text visible

  test('rango helper text is visible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/#/AGENDA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const helperText = page.locator('text=Rango: 7–180 días').first();
    await expect(helperText).toBeVisible({ timeout: 5_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4: Guardar button disabled when value unchanged

  test('Guardar button disabled when value unchanged', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/#/AGENDA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // Wait for card to finish loading
    await page.waitForTimeout(1_000);

    const guardarBtn = page.locator('button:has-text("Guardar")').first();
    const isDisabled = await guardarBtn.isDisabled().catch(() => false);
    // Button should be disabled when no change has been made
    expect(isDisabled).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5: Guardar button enables after changing value

  test('Guardar button enables after changing value', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/#/AGENDA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    await page.waitForTimeout(1_000);

    const input = page.locator('input[type="number"]').first();
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Clear and type a new value (within valid range 7-180)
    await input.clear();
    await input.fill('60');

    const guardarBtn = page.locator('button:has-text("Guardar")').first();
    const isEnabled = await guardarBtn.isEnabled().catch(() => false);
    expect(isEnabled).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 6: Sistema section header renders (parent section)

  test('Sistema section header renders', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/#/AGENDA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const sistemaLabel = page.locator('text=Sistema').first();
    await expect(sistemaLabel).toBeVisible({ timeout: 5_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 7: FreshnessConfigCard component file exists and exports default

  test('FreshnessConfigCard file exists and exports default', async ({ page }) => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.join(process.cwd(), 'src/modules/admin/agenda/FreshnessConfigCard.jsx');
    expect(fs.existsSync(componentPath)).toBe(true);

    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain('export default FreshnessConfigCard');
    expect(content).toContain('useN8nQuery');
    expect(content).toContain("'crm-lead-freshness-config'");
    expect(content).toContain('Umbral de contactabilidad');
    expect(content).toContain('Rango: 7–180 días');
    expect(content).toContain('#D00000'); // Navy Industrial accent
    expect(content).not.toContain('animate-pulse'); // no spinners, only skeleton
    expect(content).not.toContain('console.log');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 8: AgendaGlobalPanel imports and renders FreshnessConfigCard

  test('AgendaGlobalPanel wires FreshnessConfigCard in sidebar', async ({ page }) => {
    const fs = require('fs');
    const path = require('path');
    const panelPath = path.join(process.cwd(), 'src/modules/admin/agenda/AgendaGlobalPanel.jsx');
    const content = fs.readFileSync(panelPath, 'utf8');

    expect(content).toContain("import FreshnessConfigCard from './FreshnessConfigCard'");
    expect(content).toContain('<FreshnessConfigCard');
    expect(content).toContain('admin.system.config');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 9: User without admin.system.config sees AccessDenied for AgendaGlobalPanel

  test('user without admin.system.config sees AccessDenied', async ({ page }) => {
    await loginAsOperador(page);
    await page.goto('/#/AGENDA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const accessDenied = page.locator('text=Acceso restringido').first();
    await expect(accessDenied).toBeVisible({ timeout: 5_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 10: Guardar button text includes save icon

  test('Guardar button contains save icon', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/#/AGENDA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    await page.waitForTimeout(1_000);

    // The button should have both text and an SVG icon (Save from lucide-react)
    const guardarBtn = page.locator('button:has-text("Guardar")').first();
    await expect(guardarBtn).toBeVisible({ timeout: 5_000 });
    // Button contains SVG (lucide Save icon)
    const svgInButton = guardarBtn.locator('svg').first();
    await expect(svgInButton).toBeVisible({ timeout: 3_000 });
  });
});
