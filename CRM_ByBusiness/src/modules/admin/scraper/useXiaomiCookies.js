/**
 * useXiaomiCookies — hook para gestionar cookies del Xiaomi-12.
 *
 * Provee:
 *  - status: último estado de cookies (del workflow STATUS)
 *  - uploadCookies(cookiesArray, appliedBy): envía cookies al workflow UPLOAD
 *  - isLoading / isError / notification para feedback UI
 *
 * Permiso RBAC: admin.system.config
 *
 * @since xiaomi-cookies-admin 2026-08-12
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useN8nQuery, useN8nMutation } from '../../../shared/hooks/useN8n';

/**
 * @returns {{
 *   status: object|null,
 *   isStatusLoading: boolean,
 *   isStatusError: boolean,
 *   refetchStatus: Function,
 *   uploadCookies: Function,
 *   isUploading: boolean,
 *   uploadResult: object|null,
 *   uploadError: object|null,
 *   clearUploadResult: Function,
 *   notification: object|null,
 * }}
 */
const useXiaomiCookies = () => {
  const [notification, setNotification] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const { data: status, isLoading: isStatusLoading, isError: isStatusError, refetch: refetchStatus } =
    useN8nQuery(['xiaomi-cookies-status'], 'crm-xiaomi-cookies-status-get', { staleTime: 30_000 });

  const mutation = useN8nMutation('crm-xiaomi-cookies-apply');

  // Track notification auto-clear timeout to avoid leaked timers.
  const notificationTimeoutRef = useRef(null);
  const scheduleNotificationClear = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, 5000);
  }, []);
  useEffect(() => () => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
  }, []);

  /**
   * Envía cookies al workflow UPLOAD para persistir en DB.
   *
   * @param {Array<object>} cookiesArray - array de cookies (formatos: Chrome, curl, Playwright)
   * @param {string} [appliedBy='admin'] - usuario que aplica
   * @returns {Promise<object|null>}
   */
  const uploadCookies = useCallback(
    async (cookiesArray, appliedBy = 'admin') => {
      if (!Array.isArray(cookiesArray) || cookiesArray.length === 0) {
        const msg = 'No se proporcionaron cookies.';
        setUploadError({ message: msg });
        setNotification({ type: 'error', message: msg });
        return null;
      }

      setUploadResult(null);
      setUploadError(null);
      setNotification(null);

      try {
        const result = await mutation.mutateAsync({ cookies: cookiesArray, applied_by: appliedBy });

        setUploadResult(result);
        const days = result?.days_until_earliest_expiry ?? '?';
        const count = result?.cookie_count ?? cookiesArray.length;
        setNotification({
          type: 'success',
          message: `${count} cookies subidos. Próximo expiry en ${days} día${days === 1 ? '' : 's'}.`,
        });
        refetchStatus();
        scheduleNotificationClear();
        return result;
      } catch (err) {
        const msg = err?.message || err?.reason || 'Error desconocido al subir cookies.';
        setUploadError({ message: msg });
        setNotification({ type: 'error', message: msg });
        scheduleNotificationClear();
        return null;
      }
    },
    [mutation, refetchStatus, scheduleNotificationClear]
  );

  return {
    status: status ?? null,
    isStatusLoading,
    isStatusError,
    refetchStatus,
    uploadCookies,
    isUploading: mutation.isPending,
    uploadResult,
    uploadError,
    clearUploadResult: () => setUploadResult(null),
    notification,
  };
};

export { useXiaomiCookies };
