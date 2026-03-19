/**
 * Cliente n8n — centraliza todas las llamadas al BFF.
 *
 * Exporta funciones de fetch (n8nFetch, n8nGet, n8nPost) y hooks React Query
 * (useN8nQuery, useN8nMutation). También expone n8nHealthCheck para heartbeat.
 *
 * URL base: VITE_N8N_URL (ej. https://n8n.ia-bybusiness.online/webhook)
 * Reintentos: 1 reintento automático ante fallo de red (no ante timeout).
 */
import { useQuery, useMutation } from '@tanstack/react-query';

/** @type {string} */
const BASE_URL = import.meta.env.VITE_N8N_URL ?? 'http://localhost:5678/webhook';

const TIMEOUT_MS     = 12_000;
const RETRY_DELAY_MS = 600;

/**
 * Fetch con timeout controlado por AbortController.
 * @param {string}      url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timerId));
}

/**
 * Llamada base a un webhook de n8n con 1 reintento automático.
 * @param {string}      path    - ruta relativa (ej. 'crm-leads-get')
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>}
 */
export async function n8nFetch(path, options = {}) {
  const url  = `${BASE_URL}/${path}`;
  const init = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    try {
      const res = await fetchWithTimeout(url, init);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`n8n ${res.status}: ${body || res.statusText}`);
      }
      return res.json();
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') break; // timeout — no reintentar
    }
  }
  throw lastError;
}

/**
 * POST a un webhook de n8n.
 * @param {string}  path
 * @param {unknown} [body]
 * @returns {Promise<unknown>}
 */
export const n8nPost = (path, body) =>
  n8nFetch(path, { method: 'POST', body: JSON.stringify(body) });

/**
 * GET a un webhook de n8n con query params opcionales.
 * @param {string}                 path
 * @param {Record<string, string>} [params]
 * @returns {Promise<unknown>}
 */
export const n8nGet = (path, params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return n8nFetch(path + qs, { method: 'GET' });
};

/**
 * Verifica que n8n está disponible.
 * Cualquier respuesta HTTP (incluso 404) significa que n8n vive.
 * Solo un error de red o timeout devuelve false.
 * @returns {Promise<boolean>}
 */
export async function n8nHealthCheck() {
  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), 5_000);
  try {
    // mode: 'no-cors' evita bloqueo CORS para webhooks no registrados.
    // Con respuesta opaca, status === 0 (< 500 → true). Sin red → throw → false.
    await fetch(`${BASE_URL}/crm-health`, {
      method: 'GET',
      mode:   'no-cors',
      signal: controller.signal,
    });
    return true;
  } catch (_err) {
    return false;
  } finally {
    clearTimeout(timerId);
  }
}

/**
 * Hook React Query para consultas GET a n8n.
 * @param {string[]} queryKey
 * @param {string}   path
 * @param {object}   [queryOptions]
 */
export const useN8nQuery = (queryKey, path, queryOptions = {}) =>
  useQuery({
    queryKey,
    queryFn: () => n8nGet(path),
    ...queryOptions,
  });

/**
 * Hook React Query para mutaciones POST a n8n.
 * @param {string} path
 * @param {object} [mutationOptions]
 */
export const useN8nMutation = (path, mutationOptions = {}) =>
  useMutation({
    mutationFn: (data) => n8nPost(path, data),
    ...mutationOptions,
  });
