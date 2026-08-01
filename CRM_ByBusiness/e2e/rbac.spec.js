import { test, expect } from '@playwright/test';

/**
 * E2E tests for RBAC (Role-Based Access Control).
 *
 * Verifies that sidebar navigation items are filtered based on user role.
 *
 * Admin users (rol=admin) have reportes.read permission → see Auditoria
 * Operador users (rol=operador) do NOT have reportes.read → no Auditoria
 *
 * Test users from DB (auth.usuarios):
 *   Admin:    rafaeldelinares@gmail.com (rol=admin, estado=activo)
 *   Operador: op1@test.com (rol=operador, estado=activo)
 *
 * @see src/shared/auth/rbac.js — RBAC module definition
 * @see src/shared/layout/Sidebar.jsx — Sidebar with RBAC filtering
 */
test.describe('RBAC Permissions', () => {

  /**
   * Admin user should see the Auditoria section in the sidebar.
   * Admin has all permissions including reportes.read which is required for Auditoria.
   */
  test('admin sees Auditoria in sidebar', async ({ page }) => {
    // Set admin session in localStorage (bypass login)
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

    // Wait for dashboard to load
    await page.waitForURL('**/');

    // Look for Auditoria in sidebar
    // The sidebar shows categories based on permissions
    const auditoriaLink = page.locator('text=Auditoría, text=AUDITORIA');
    await expect(auditoriaLink).toBeVisible({ timeout: 10000 });
  });

  /**
   * Operador user should NOT see the Auditoria section in the sidebar.
   * Operador role does not have reportes.read permission.
   */
  test('operador does not see Auditoria in sidebar', async ({ page }) => {
    // Set operador session in localStorage (bypass login)
    await page.goto('/');

    await page.evaluate(() => {
      const operadorUser = {
        id: 1000,
        email: 'op1@test.com',
        role: 'operador',
        nombre: 'Operador Test 1',
        totp_habilitado: false,
        totp_configurado: false,
        es_simulacion: false,
      };
      localStorage.setItem('op_user', JSON.stringify(operadorUser));
    });

    await page.reload();

    // Wait for dashboard to load
    await page.waitForURL('**/');

    // Operador should NOT see Auditoria in sidebar
    // The sidebar for operador shows only Mi Próxima Llamada (NEXT_CALL)
    // So we verify that a full category navigation is not present
    const sidebar = page.locator('nav').first();

    // Should see operador-specific menu
    const miProximaLlamada = page.locator('text=Mi Próxima Llamada');
    await expect(miProximaLlamada).toBeVisible({ timeout: 10000 });

    // Should NOT see Auditoria (which requires reportes.read)
    // Check that no element containing "Auditor" is visible in sidebar
    const auditoriaElements = page.locator('text=/auditoria/i');
    await expect(auditoriaElements).toHaveCount(0, { timeout: 5000 });
  });

  /**
   * Verify that admin sidebar has more menu categories than operador.
   * Admin sees: Dashboard, Agenda, Clientes, Campañas, Gestión Leads,
   *             Ventas, Google Business, Facturación, Gestoría,
   *             Candidatos RRHH, Usuarios, Entrenamiento, Auditoría
   * Operador sees only: Mi Próxima Llamada
   */
  test('admin sidebar has more items than operador sidebar', async ({ page }) => {
    // Test admin sidebar
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

    const adminNavItems = await page.locator('nav button').count();

    // Test operador sidebar
    await page.evaluate(() => {
      const operadorUser = {
        id: 1000,
        email: 'op1@test.com',
        role: 'operador',
        nombre: 'Operador Test 1',
        totp_habilitado: false,
        totp_configurado: false,
        es_simulacion: false,
      };
      localStorage.setItem('op_user', JSON.stringify(operadorUser));
    });
    await page.reload();
    await page.waitForURL('**/');

    const operadorNavItems = await page.locator('nav button').count();

    // Admin should have significantly more nav items than operador
    expect(adminNavItems).toBeGreaterThan(operadorNavItems);
  });
});
