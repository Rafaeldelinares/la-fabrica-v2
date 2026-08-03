/**
 * reportFrontendError.test.js
 *
 * Tests for the reportFrontendError helper.
 * Covers: correct fetch call, missing webhook warning, swallowed errors,
 * keepalive flag, and session/user ID population.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to use a fresh module import each time to test different env states
let reportFrontendError;
let fetchMock;

describe('reportFrontendError', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
    global.fetch = fetchMock;
    // Clear sessionStorage between tests
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
      window.localStorage.clear();
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('calls fetch with correct URL and body when VITE_FRONTEND_ERROR_WEBHOOK is set', async () => {
    vi.stubEnv('VITE_FRONTEND_ERROR_WEBHOOK', 'https://n8n.ia-bybusiness.online/webhook/crm-frontend-error');
    vi.stubEnv('VITE_APP_VERSION', '1.2.3');

    // Re-import after stubbing env
    const mod = await import('../reporting/reportFrontendError');
    reportFrontendError = mod.reportFrontendError;

    reportFrontendError({
      tipo: 'frontend_error',
      componente: 'ErrorBoundary',
      mensaje: 'Cannot read property x of undefined',
      stack: 'Error: Cannot read...\n    at Foo (foo.js:1)',
      url: 'https://crm.ia-bybusiness.com/admin/campanas',
      metadata: { browser: 'Chrome 124' },
    });

    // Allow the promise chain to resolve
    await new Promise(setImmediate);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://n8n.ia-bybusiness.online/webhook/crm-frontend-error');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.keepalive).toBe(true);

    const body = JSON.parse(options.body);
    expect(body.tipo).toBe('frontend_error');
    expect(body.componente).toBe('ErrorBoundary');
    expect(body.mensaje).toBe('Cannot read property x of undefined');
    expect(body.stack).toBe('Error: Cannot read...\n    at Foo (foo.js:1)');
    expect(body.url).toBe('https://crm.ia-bybusiness.com/admin/campanas');
    expect(body.timestamp).toBeTruthy();
    expect(body.session_id).toBeTruthy();
    expect(body.user_id).toBeNull(); // no auth_user in localStorage in test
    expect(body.metadata.browser).toBe('Chrome 124');
    expect(body.metadata.userAgent).toBeTruthy();
  });

  it('warns and skips when VITE_FRONTEND_ERROR_WEBHOOK is missing', async () => {
    vi.stubEnv('VITE_FRONTEND_ERROR_WEBHOOK', '');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mod = await import('../reporting/reportFrontendError');
    reportFrontendError = mod.reportFrontendError;

    reportFrontendError({ tipo: 'frontend_error', componente: 'test', mensaje: 'boom' });

    await new Promise(setImmediate);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[ErrorReporting] VITE_FRONTEND_ERROR_WEBHOOK not configured, skipping report');
    warnSpy.mockRestore();
  });

  it('swallows fetch errors without throwing', async () => {
    vi.stubEnv('VITE_FRONTEND_ERROR_WEBHOOK', 'https://n8n.ia-bybusiness.online/webhook/crm-frontend-error');
    fetchMock.mockRejectedValue(new Error('Network failure'));

    const mod = await import('../reporting/reportFrontendError');
    reportFrontendError = mod.reportFrontendError;

    expect(() => {
      reportFrontendError({ tipo: 'frontend_error', componente: 'test', mensaje: 'boom' });
    }).not.toThrow();

    await new Promise(setImmediate);
    // Should have attempted the call (error swallowed)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('populates session_id in sessionStorage for subsequent calls', async () => {
    vi.stubEnv('VITE_FRONTEND_ERROR_WEBHOOK', 'https://n8n.ia-bybusiness.online/webhook/crm-frontend-error');

    const mod = await import('../reporting/reportFrontendError');
    reportFrontendError = mod.reportFrontendError;

    reportFrontendError({ tipo: 'frontend_error', componente: 'test', mensaje: 'boom1' });
    await new Promise(setImmediate);
    const firstSessionId = fetchMock.mock.calls[0][1].body ? JSON.parse(fetchMock.mock.calls[0][1].body).session_id : null;

    reportFrontendError({ tipo: 'frontend_error', componente: 'test', mensaje: 'boom2' });
    await new Promise(setImmediate);
    const secondSessionId = fetchMock.mock.calls[1][1].body ? JSON.parse(fetchMock.mock.calls[1][1].body).session_id : null;

    expect(firstSessionId).toBeTruthy();
    expect(secondSessionId).toBe(firstSessionId);
  });

  it('populates user_id from auth_user in localStorage', async () => {
    vi.stubEnv('VITE_FRONTEND_ERROR_WEBHOOK', 'https://n8n.ia-bybusiness.online/webhook/crm-frontend-error');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('auth_user', JSON.stringify({ id: 42, name: 'Test User' }));
    }

    const mod = await import('../reporting/reportFrontendError');
    reportFrontendError = mod.reportFrontendError;

    reportFrontendError({ tipo: 'frontend_error', componente: 'test', mensaje: 'boom' });
    await new Promise(setImmediate);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.user_id).toBe(42);
  });
});
