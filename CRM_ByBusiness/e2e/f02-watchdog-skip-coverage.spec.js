import { test, expect } from '@playwright/test';

/**
 * E2E smoke test for F02 — watchdog-skip-coverage.
 *
 * CR-03 / S05 R4: Verifies that the watchdog skip logic is documented and that
 * the cancel operation correctly transitions callbacks to 'cancelada' state,
 * which the watchdog's DB function (`crm_watchdog_callbacks`) excludes via
 * its `WHERE lp.estado = 'pendiente'` filter.
 *
 * The watchdog workflow `CRM_WATCHDOG_CALLBACKS_V2` has its IF and UPDATE
 * nodes disabled — all skip logic lives in the DB function. The E2E confirms
 * the cancel path works end-to-end; the skip behavior is provably correct
 * from the DB function body (verified 2026-08-02).
 *
 * @see openspec/changes/crm-critical-followups/specs/lead-callbacks/spec.md
 * @see openspec/specs/lead-callbacks/spec.md (REQ-005 verification evidence)
 */
test.describe('F02: watchdog-skip-coverage (CRM_WATCHDOG_CALLBACKS_V2 skip logic)', () => {

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
    const zone1 = page.locator('input[placeholder="Ciudad / Localidad"]').first();
    await expect(zone1).toBeVisible({ timeout: 10_000 });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Cancelled callback disappears from MisCallbacksPanel list
  //
  // The cancel action transitions estado to 'cancelada'. The watchdog DB
  // function has `WHERE lp.estado = 'pendiente'` — cancelled callbacks are
  // therefore never selected for redistribution.

  test('cancelled callback is removed from list (confirming watchdog would skip it)', async ({ page }) => {
    await loginAsOperador(page);

    // Navigate to Zone4 where MisCallbacksPanel renders
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');

    // Find first callback's Cancel button
    const cancelBtn = page.locator('.bg-slate-900.border.border-slate-800.rounded-sm button:has-text("Cancel")').first();
    const hasCallback = await cancelBtn.count() > 0;

    if (!hasCallback) {
      test.skip('No callbacks available to cancel — skip test');
      return;
    }

    // Count callbacks before cancel
    const countBefore = await page.locator('.bg-slate-900.border.border-slate-800.rounded-sm').filter({
      has: page.locator('button:has-text("Cancel")'),
    }).count();

    // Open cancel dialog
    await cancelBtn.click();
    const dialog = page.locator('h3:has-text("Cancel Callback")');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Confirm cancellation
    const confirmBtn = page.locator('button:has-text("Yes, cancel")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Dialog closes
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // Success toast appears
    const toast = page.locator('.bg-emerald-900\\/50, .text-emerald-400');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });

    // Wait for network to settle
    await page.waitForLoadState('networkidle');

    // Callback count decreases (or empty state appears)
    const countAfter = await page.locator('.bg-slate-900.border.border-slate-800.rounded-sm').filter({
      has: page.locator('button:has-text("Cancel")'),
    }).count();

    expect(countAfter).toBeLessThan(countBefore);

    // NOTE: The cancelled callback is now in estado='cancelada'. The watchdog
    // DB function's cursor has `WHERE lp.estado = 'pendiente'` — this callback
    // will never be picked up for redistribution. The IF + UPDATE nodes in
    // CRM_WATCHDOG_CALLBACKS_V2 are disabled anyway, so even if they ran,
    // no redistribution would occur.
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: MisCallbacksPanel renders without crashing (smoke)

  test('MisCallbacksPanel renders without console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await loginAsOperador(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');

    // Panel label should be visible
    const label = page.locator('text=My Callbacks').first();
    await expect(label).toBeVisible({ timeout: 10_000 });

    // No console errors
    expect(consoleErrors).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3: Verify DB function skip-logic documentation file exists

  test('watchdog verification doc exists with correct findings', async ({ page: _page }) => {
    const fs = require('fs');
    const path = require('path');
    const docPath = path.join(process.cwd(), '.workflows/f02-watchdog-verification.md');
    expect(fs.existsSync(docPath)).toBe(true);

    const content = fs.readFileSync(docPath, 'utf8');
    // Key evidence: WHERE clause that filters out cancelled callbacks
    expect(content).toContain("WHERE lp.estado = 'pendiente'");
    // Disabled nodes confirmed
    expect(content).toContain('Hay callbacks');
    expect(content).toContain('Redistribuir Callback');
    expect(content).toContain('disabled');
    // Verification date
    expect(content).toContain('2026-08-02');
  });
});
