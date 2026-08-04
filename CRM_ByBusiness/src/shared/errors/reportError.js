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
    const baseUrl = import.meta.env?.VITE_N8N_URL;
    if (!baseUrl) {
      // In DEV, surface the misconfiguration; in prod, fall back silently (never throw).
      if (import.meta.env?.DEV) {
        throw new Error('[envValidation] Missing required env var "VITE_N8N_URL"');
      }
      // Silent fallback for production — preserves the "never throw" contract.
      return;
    }

    // DEV: log structured metadata before attempting POST (tree-shaken in prod by Vite)
    if (import.meta.env?.DEV) {
      console.error('[reportError] Dispatching FRONTEND_ERROR event', {
        event_type: 'FRONTEND_ERROR',
        error_message: payload.error_message,
        component_stack: payload.component_stack,
        zone_id: payload.zone_id,
        timestamp: payload.timestamp,
        user_id: payload.user_id,
      });
    }

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
