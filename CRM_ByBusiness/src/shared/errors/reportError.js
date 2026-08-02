/**
 * Reports a JavaScript error to sistema.eventos_sistema via the
 * CRM_60_POST_EVENTO_SISTEMA webhook.
 *
 * This function MUST NEVER throw. All errors are silenced.
 *
 * @param {Error} error
 * @param {{ componentStack?: string, zoneId?: string }} [context]
 */
export function reportError(error, context = {}) {
  const payload = {
    event_type: 'FRONTEND_ERROR',
    error_message: error?.message || String(error),
    component_stack: context.componentStack || '',
    zone_id: context.zoneId || null,
    timestamp: new Date().toISOString(),
    user_id: getCurrentUserId(),
  };

  try {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_N8N_URL) ||
      'https://n8n.ia-bybusiness.online/webhook';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    fetch(`${baseUrl}/crm-evento-sistema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => {
      // Network failure — silenced. In DEV, log for visibility.
      if (import.meta.env?.DEV) {
        console.error('[reportError] Failed to post FRONTEND_ERROR event:', payload);
      }
    }).finally(() => clearTimeout(timer));
  } catch {
    // Silenced — this function must never throw.
  }
}

/**
 * @returns {string|null}
 */
function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('op_user') || '{}');
    return user.id || null;
  } catch {
    return null;
  }
}
