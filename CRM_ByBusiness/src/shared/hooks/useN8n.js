/**
 * Cliente n8n — centraliza todas las llamadas al BFF.
 * Exporta funciones de fetch (n8nFetch, n8nGet, n8nPost) y hooks React Query
 * (useN8nQuery, useN8nMutation). También expone n8nHealthCheck para heartbeat.
 * URL base: VITE_N8N_URL (ej. https://n8n.ia-bybusiness.online/webhook)
 * Reintentos: 1 reintento automático ante fallo de red (no ante timeout).
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { validateEnvVar } from '../utils/envValidation';

const BASE_URL    = validateEnvVar('VITE_N8N_URL');
const TIMEOUT_MS  = 12_000;
const RETRY_DELAY_MS = 600;

/**
 * Delay cancelable. El caller puede invocar promise.cancel() para limpiar
 * el setTimeout si abandona la espera (cumple GGA: setTimeout con clearTimeout).
 */
const sleep = (ms) => {
  let timeoutId;
  const promise = new Promise((resolve) => {
    timeoutId = setTimeout(resolve, ms);
  });
  promise.cancel = () => clearTimeout(timeoutId);
  return promise;
};

/** Obtiene el rol del usuario desde localStorage. */
const getUserRole = () => {
  try {
    const stored = localStorage.getItem('op_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.role || parsed.rol || '';
    }
  } catch (err) {
    // localStorage no disponible o datos corruptos — fallback a vacío
    console.warn('[getUserRole] localStorage no disponible:', err?.message);
  }
  return '';
};

/** Fetch con timeout controlado por AbortController. */
const fetchWithTimeout = (url, options, timeoutMs = TIMEOUT_MS) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
  return fetch(url, { ...options, signal: abortController.signal }).finally(() => clearTimeout(timeoutId));
};

/**
 * Llamada base a un webhook de n8n con 1 reintento automático.
 * @param {string} path - ruta del webhook o URL absoluta
 * @param {RequestInit & { baseUrl?: string, timeoutMs?: number }} [options]
 */
export async function n8nFetch(path, options = {}) {
  const isAbsoluteUrl = /^https?:\/\//.test(path);
  const url = isAbsoluteUrl ? path : `${options.baseUrl ?? BASE_URL}/${path}`;
  const fetchInit = {
    ...options,
    headers: { ...options.headers, 'Content-Type': 'application/json', 'x-user-role': getUserRole() },
  };

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS);
    try {
      const res = await fetchWithTimeout(url, fetchInit, fetchInit.timeoutMs);
      if (!res.ok) throw new Error(`n8n ${res.status}: ${(await res.text().catch(() => '')) || res.statusText}`);
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') break;
    }
  }
  throw lastError;
}

/** POST a un webhook de n8n. */
export const n8nPost = (path, body, options = {}) =>
  n8nFetch(path, { ...options, method: 'POST', body: JSON.stringify(body) });

/** GET a un webhook de n8n con query params opcionales. */
export const n8nGet = (path, params, options = {}) =>
  n8nFetch(`${path}${params ? '?' + new URLSearchParams(params) : ''}`, { ...options, method: 'GET' });

/** Verifica que n8n está disponible. */
export async function n8nHealthCheck() {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 5_000);
  try {
    await fetch(`${BASE_URL}/crm-health`, { method: 'GET', mode: 'no-cors', signal: abortController.signal });
    return true;
  } catch (err) {
    console.warn('[n8nHealthCheck] n8n no disponible:', err?.message);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Hook React Query para consultas GET a n8n. */
export const useN8nQuery = (queryKey, path, queryOptions = {}) => {
  const { params, queryFn, ...rest } = queryOptions;
  return useQuery({ queryKey, queryFn: queryFn ?? (() => n8nGet(path, params)), ...rest });
};

/** Hook React Query para mutaciones POST a n8n. */
export const useN8nMutation = (path, mutationOptions = {}) =>
  useMutation({ mutationFn: (data) => n8nPost(path, data), ...mutationOptions });
