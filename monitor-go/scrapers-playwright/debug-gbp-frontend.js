#!/usr/bin/env node
/**
 * debug-gbp-frontend.js — Sesión Playwright headless para ver EXACTAMENTE
 * lo que ve el usuario en el browser cuando abre cliente 693 y click Auditar.
 *
 * Usage: node debug-gbp-frontend.js <email> <password>
 */
const { chromium } = require('playwright');

(async () => {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node debug-gbp-frontend.js <email> <password>');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const requests = [];
  const responses = [];
  const consoleMsgs = [];

  page.on('request', req => {
    if (req.url().includes('n8n.ia-bybusiness.online')) {
      requests.push({
        method: req.method(),
        url: req.url().replace('https://n8n.ia-bybusiness.online', ''),
        headers: req.headers(),
        postData: req.postData()?.slice(0, 200),
      });
    }
  });

  page.on('response', async res => {
    if (res.url().includes('n8n.ia-bybusiness.online')) {
      const body = await res.text().catch(() => '');
      responses.push({
        method: res.request().method(),
        url: res.url().replace('https://n8n.ia-bybusiness.online', ''),
        status: res.status(),
        headers: Object.fromEntries(
          Object.entries(res.headers()).filter(([k]) => k.startsWith('access-control'))
        ),
        body: body.slice(0, 500),
      });
    }
  });

  page.on('console', msg => {
    consoleMsgs.push({ type: msg.type(), text: msg.text().slice(0, 300) });
  });

  console.log('=== STEP 1: Login ===');
  await page.goto('https://crm.ia-bybusiness.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: '/tmp/debug-01-login.png', fullPage: true });

  // Try to fill login form
  const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.count() > 0) {
    await emailInput.fill(email);
    const pwdInput = await page.locator('input[type="password"]').first();
    await pwdInput.fill(password);
    const submit = await page.locator('button[type="submit"]').first();
    await submit.click();
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: '/tmp/debug-02-after-login.png', fullPage: true });

  console.log('=== STEP 2: Navigate to Cartera ===');
  await page.goto('https://crm.ia-bybusiness.com/admin/cartera', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/debug-03-cartera.png', fullPage: true });

  console.log('=== STEP 3: Open cliente 693 ===');
  // Try to find cliente 693 — could be in a table or search
  const clienteLink = await page.locator('text=/693|AG FITNESS/i').first();
  if (await clienteLink.count() > 0) {
    await clienteLink.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: '/tmp/debug-04-cliente.png', fullPage: true });

  console.log('=== STEP 4: Click tab Google Business ===');
  const gbpTab = await page.locator('text=/Google Business/i').first();
  if (await gbpTab.count() > 0) {
    await gbpTab.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: '/tmp/debug-05-gbp-tab.png', fullPage: true });

  console.log('=== STEP 5: Expand AUDIT section ===');
  const auditSection = await page.locator('text=/^AUDIT$/').first();
  if (await auditSection.count() > 0) {
    await auditSection.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: '/tmp/debug-06-audit-expanded.png', fullPage: true });

  console.log('=== STEP 6: Click Auditar button ===');
  const auditarBtn = await page.locator('button:has-text("Auditar")').first();
  if (await auditarBtn.count() > 0) {
    const isDisabled = await auditarBtn.isDisabled();
    console.log('Auditar button disabled?', isDisabled);
    if (!isDisabled) {
      await auditarBtn.click();
      console.log('Clicked Auditar, waiting 30s...');
      await page.waitForTimeout(30000);
    }
  }
  await page.screenshot({ path: '/tmp/debug-07-after-auditar.png', fullPage: true });

  console.log('\n=== REPORT ===\n');

  console.log('--- Console messages ---');
  consoleMsgs.forEach(m => console.log(`[${m.type}] ${m.text}`));

  console.log('\n--- Requests to n8n ---');
  requests.forEach(r => {
    console.log(`${r.method} ${r.url}`);
    console.log(`  headers: ${JSON.stringify(r.headers, null, 2)}`);
    if (r.postData) console.log(`  body: ${r.postData}`);
  });

  console.log('\n--- Responses from n8n ---');
  responses.forEach(r => {
    console.log(`${r.method} ${r.url} → ${r.status}`);
    console.log(`  CORS: ${JSON.stringify(r.headers)}`);
    console.log(`  body: ${r.body}`);
  });

  await browser.close();
})().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});