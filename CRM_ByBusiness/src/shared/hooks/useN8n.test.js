/**
 * useN8n.test.js
 *
 * Tests for n8nFetch, n8nPost, n8nGet, and n8nHealthCheck.
 * Run with: npx vitest run src/shared/hooks/useN8n.test.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { n8nFetch, n8nPost, n8nGet, n8nHealthCheck } from './useN8n';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

describe('n8nFetch', () => {
  it('agrega header x-user-role desde localStorage op_user', async () => {
    localStorage.setItem('op_user', JSON.stringify({ id: 1, role: 'admin' }));
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true}') });
    await n8nFetch('/test-path');
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers?.['x-user-role']).toBe('admin');
  });

  it('usa rol supervisor desde localStorage', async () => {
    localStorage.setItem('op_user', JSON.stringify({ id: 2, role: 'supervisor' }));
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true}') });
    await n8nFetch('/test-path');
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers?.['x-user-role']).toBe('supervisor');
  });

  it('envia header vacio cuando no hay usuario en localStorage', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true}') });
    await n8nFetch('/test-path');
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers?.['x-user-role']).toBe('');
  });

  it('siempre agrega Content-Type application/json', async () => {
    localStorage.setItem('op_user', JSON.stringify({ id: 3, role: 'operador' }));
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true}') });
    await n8nFetch('/test-path');
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers?.['Content-Type']).toBe('application/json');
  });

  it('permite overrides de headers via options', async () => {
    localStorage.setItem('op_user', JSON.stringify({ id: 4, role: 'admin' }));
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true}') });
    await n8nFetch('/test-path', { headers: { 'x-custom': 'value' } });
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers?.['x-custom']).toBe('value');
    expect(init.headers?.['x-user-role']).toBe('admin');
  });

  it('lanza error cuando respuesta no es ok', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('workflow not found'),
    };
    // n8nFetch reintenta 1 vez ante fallo de red, así que mockeamos ambas llamadas
    mockFetch.mockResolvedValue(mockResponse);
    await expect(n8nFetch('/not-found')).rejects.toThrow('n8n 404');
  });

  it('retorna null cuando response body esta vacio', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('') });
    const result = await n8nFetch('/empty-response');
    expect(result).toBeNull();
  });

  it('soporta URL absoluta sin baseUrl', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true}') });
    await n8nFetch('https://other-n8n.com/webhook/custom-path');
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://other-n8n.com/webhook/custom-path');
  });
});

describe('n8nPost', () => {
  it('usa metodo POST y stringify el body', async () => {
    localStorage.setItem('op_user', JSON.stringify({ id: 5, role: 'admin' }));
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{"created":true}') });
    await n8nPost('/create-lead', { nombre: 'Test Lead' });
    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ nombre: 'Test Lead' }));
  });
});

describe('n8nGet', () => {
  it('usa metodo GET y agrega query params', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('[]') });
    await n8nGet('/leads', { estado: 'nuevo', page: '1' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('?estado=nuevo&page=1');
    expect(init.method).toBe('GET');
  });
});

describe('n8nHealthCheck', () => {
  it('retorna true cuando fetch es exitoso (no-cors)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const result = await n8nHealthCheck();
    expect(result).toBe(true);
  });

  it('retorna false cuando hay error de red', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await n8nHealthCheck();
    expect(result).toBe(false);
  });
});
