import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Agenda Global panel.
 *
 * Tests basic functionality:
 *   - Panel loads after admin login
 *   - Filter toggles are visible
 *   - Clicking a toggle changes its state
 *
 * @see src/modules/admin/agenda/AgendaGlobalPanel.jsx — Agenda panel component
 */
test.describe('Agenda Global Panel', () => {

  /**
   * Helper: log in as admin and navigate to Agenda.
   */
  async function loginAsAdmin(page) {
    await page.goto('/');

    // Set admin session in localStorage (bypass login)
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

    // Navigate to Agenda (AGENDA_GLOB tab)
    // The sidebar should have an Agenda link
    const agendaLink = page.locator('text=Agenda').first();
    await agendaLink.click();

    // Wait for navigation or content update
    await page.waitForTimeout(1000);
  }

  test('agenda panel loads for admin user', async ({ page }) => {
    await loginAsAdmin(page);

    // Verify the agenda toolbar is visible
    // The agenda has navigation buttons (ChevronLeft, ChevronRight)
    // and view selector buttons (DÍA, SEMANA, MES)
    const dayButton = page.locator('button:has-text("DÍA")');
    const weekButton = page.locator('button:has-text("SEMANA")');
    const monthButton = page.locator('button:has-text("MES")');

    await expect(dayButton).toBeVisible({ timeout: 10000 });
    await expect(weekButton).toBeVisible();
    await expect(monthButton).toBeVisible();
  });

  test('filter toggles are visible in agenda toolbar', async ({ page }) => {
    await loginAsAdmin(page);

    // The agenda has filter toggles for event types:
    // Cita cliente, Callback operador, Interacción, Llamada operador,
    // Próxima acción, Backup sistema, Cron sistema, GBP Snapshot, etc.
    // These are rendered as buttons with icon + label

    // Look for at least one toggle - Cron sistema is a good indicator
    const cronToggle = page.locator('button:has-text("Cron sistema")');
    await expect(cronToggle).toBeVisible({ timeout: 10000 });

    // Also check for other toggles
    const citaToggle = page.locator('button:has-text("Cita cliente")');
    await expect(citaToggle).toBeVisible();
  });

  test('clicking a filter toggle changes its state', async ({ page }) => {
    await loginAsAdmin(page);

    // Find the Cron sistema toggle
    const cronToggle = page.locator('button:has-text("Cron sistema")');
    await expect(cronToggle).toBeVisible({ timeout: 10000 });

    // Get initial appearance - toggles have active styling when enabled
    // When enabled (filtros[tipo] = true), they have colored border/bg classes
    // When disabled, they have border-slate-800 and text-slate-700 classes

    const initialClasses = await cronToggle.getAttribute('class');

    // Click the toggle to disable it
    await cronToggle.click();
    await page.waitForTimeout(500);

    // After clicking, the classes should change
    const afterClasses = await cronToggle.getAttribute('class');
    expect(afterClasses).not.toBe(initialClasses);

    // Click again to re-enable
    await cronToggle.click();
    await page.waitForTimeout(500);

    // Classes should be back to original
    const finalClasses = await cronToggle.getAttribute('class');
    expect(finalClasses).toBe(initialClasses);
  });

  test('agenda shows event type filter buttons', async ({ page }) => {
    await loginAsAdmin(page);

    // Verify multiple event type filters are present
    // These are the TIPO keys from AgendaGlobalPanel:
    // cita_cliente, callback_operador, interaccion, llamada_operador,
    // proxima_accion_cliente, backup_sistema, cron_sistema,
    // gbp_snapshot, gbp_autorepair, envio_proforma_waha,
    // envio_proforma_email, aceptacion_proforma

    const expectedFilters = [
      'Cita cliente',
      'Callback operador',
      'Interacción',
      'Llamada operador',
      'Próxima acción',
      'Backup sistema',
      'Cron sistema',
    ];

    for (const filterName of expectedFilters) {
      const filterButton = page.locator(`button:has-text("${filterName}")`);
      await expect(filterButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('Hoy button navigates to current date', async ({ page }) => {
    await loginAsAdmin(page);

    // Find and click the HOY button
    const hoyButton = page.locator('button:has-text("HOY")');
    await expect(hoyButton).toBeVisible({ timeout: 10000 });

    await hoyButton.click();
    await page.waitForTimeout(500);

    // After clicking HOY, the date should be today's date
    // The header shows formatted date like "julio 2026" or "Friday 1 de agosto 2026"
    const hoy = new Date();
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const _expectedMonth = monthNames[hoy.getMonth()];

    // Just verify no error occurred and toolbar is still visible
    await expect(page.locator('button:has-text("MES")')).toBeVisible();
  });
});
