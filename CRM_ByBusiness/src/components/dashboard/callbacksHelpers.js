/**
 * Pure helper functions for MisCallbacksPanel.
 * @fileoverview Data extraction, datetime formatting, and classification.
 */

/**
 * Extracts callbacks array from n8n response.
 * n8n returns: [{json: {ok, callbacks_hoy: [...]}}]
 *
 * @param {unknown} data - Raw n8n query response
 * @returns {Array}
 */
const extractCallbacks = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  const json = data[0]?.json;
  if (!json) return [];
  return json.callbacks_hoy || [];
};

/**
 * Formats an ISO datetime string for display (HH:MM).
 *
 * @param {string|null} isoString
 * @returns {string}
 */
const formatScheduledAt = (isoString) => {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Converts an ISO datetime string to datetime-local input format (YYYY-MM-DDTHH:mm),
 * defaulting to 30 minutes from now if no string is provided.
 *
 * @param {string|null} isoString
 * @returns {string}
 */
const toDatetimeLocal = (isoString) => {
  if (!isoString) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  }
  const d = new Date(isoString);
  d.setMinutes(d.getMinutes() + 30);
  return d.toISOString().slice(0, 16);
};

/**
 * Returns Tailwind class names for a callback status badge.
 *
 * @param {string} status
 * @returns {{ bg: string, text: string, border: string }}
 */
const getCallbackStatusClass = (status) =>
  status === 'programado'
    ? { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' }
    : { bg: 'bg-slate-700', text: 'text-slate-400', border: 'border-slate-600' };

export { extractCallbacks, formatScheduledAt, toDatetimeLocal, getCallbackStatusClass };
