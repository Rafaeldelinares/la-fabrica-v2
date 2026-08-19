/**
 * useGestorGuard — encapsulates the gestor presence check.
 *
 * Call with a cliente object. If gestor_id is null, dispatches
 * a global `app:open-falta-gestor` event and returns { blocked: true }.
 * Otherwise returns { blocked: false }.
 *
 * @returns {{ blocked: boolean }}
 */
import { useCallback } from 'react';

const APP_OPEN_FALTA_GESTOR = 'app:open-falta-gestor';

/**
 * @param {object|null} cliente
 * @returns {{ blocked: boolean }}
 */
const useGestorGuard = (cliente) => {
  const check = useCallback(() => {
    if (cliente?.gestor_id == null) {
      window.dispatchEvent(
        new CustomEvent(APP_OPEN_FALTA_GESTOR, {
          detail: { cliente },
          bubbles: true,
        })
      );
      return true;
    }
    return false;
  }, [cliente]);

  return { blocked: check(), check };
};

export default useGestorGuard;
