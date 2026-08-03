/**
 * api.js — thin fetch wrappers around n8n webhooks.
 *
 * These are low-level utilities used by the React Query hooks in useN8n.js.
 * They delegate to n8nFetch/n8nGet/n8nPost but expose a cleaner signature
 * for queryFn bodies.
 *
 * Auth is handled internally via the n8n workflows (JWT in cookie or header
 * added by the n8n webhook setup) — no manual token needed here.
 *
 * Base URL comes from VITE_N8N_URL (required — no localhost fallback per AD-12).
 */
import { n8nGet, n8nPost } from '../hooks/useN8n';

/**
 * GET request to an n8n webhook.
 * @param {string} path - webhook path or full URL
 * @param {Record<string,string>} [params] - query string params
 * @returns {Promise<unknown>}
 */
export const apiGet = (path, params) => n8nGet(path, params);

/**
 * POST request to an n8n webhook.
 * @param {string} path - webhook path or full URL
 * @param {unknown} [body] - JSON body
 * @returns {Promise<unknown>}
 */
export const apiPost = (path, body) => n8nPost(path, body);

/**
 * PATCH request to an n8n webhook (uses POST internally since n8n webhooks
 * typically only support GET/POST; the PATCH semantics are handled by the
 * workflow itself via a POST with a _method=patch hint).
 * @param {string} path - webhook path
 * @param {unknown} body - JSON body
 * @returns {Promise<unknown>}
 */
export const apiPatch = (path, body) => n8nPost(path, { ...body, _method: 'patch' });

/**
 * DELETE request to an n8n webhook.
 * @param {string} path - webhook path
 * @returns {Promise<unknown>}
 */
export const apiDelete = (path) => n8nPost(path, { _method: 'delete' });
