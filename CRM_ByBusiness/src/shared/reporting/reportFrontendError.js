/**
 * Sends a frontend error report to the configured n8n webhook.
 * Errors are swallowed silently — error reporting must never throw.
 *
 * Required env: VITE_FRONTEND_ERROR_WEBHOOK
 *   (e.g. https://n8n.ia-bybusiness.online/webhook/crm-frontend-error)
 * Optional env: VITE_APP_VERSION (included in metadata.build)
 */
const WEBHOOK_URL = import.meta.env.VITE_FRONTEND_ERROR_WEBHOOK;

/**
 * @returns {string|null}
 */
function getSessionId() {
  if (typeof window === 'undefined') return null;
  let sid = window.sessionStorage.getItem('fe_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    window.sessionStorage.setItem('fe_session_id', sid);
  }
  return sid;
}

/**
 * @returns {string|null}
 */
function getCurrentUserId() {
  try {
    const raw = window.localStorage.getItem('auth_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ?? parsed?.user_id ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {object} payload
 * @param {string} payload.tipo
 * @param {string} payload.componente
 * @param {string} payload.mensaje
 * @param {string|null} [payload.stack]
 * @param {string|null} [payload.url]
 * @param {object} [payload.metadata]
 */
export function reportFrontendError(payload) {
  if (!WEBHOOK_URL) {
    if (typeof console !== 'undefined') {
      console.warn('[ErrorReporting] VITE_FRONTEND_ERROR_WEBHOOK not configured, skipping report');
    }
    return;
  }

  const body = JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    user_id: getCurrentUserId(),
    metadata: {
      ...(payload.metadata ?? {}),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
  });

  // keepalive ensures the request survives page unload (e.g. error during render)
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // swallow — error reporting must never throw
  });
}
