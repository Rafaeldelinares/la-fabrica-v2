/**
 * useGbpAudit — mutation hook for running a GBP audit.
 *
 * Wraps useN8nMutation for the crm-gbp-ficha-audit webhook.
 * RBAC guard is in the GbpAudit component (useRbac.can('gbp.read')).
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import { useN8nMutation } from '../../../../../../shared/hooks/useN8n';

/**
 * @param {{ placeId?: string, refresh?: boolean }} [options]
 */
export const useGbpAudit = (_options = {}) => {
  const mutation = useN8nMutation('crm-gbp-ficha-audit');

  const runAudit = (placeId, opts = {}) => {
    return mutation.mutateAsync({
      place_id: placeId,
      refresh: opts.refresh ?? false,
    });
  };

  return {
    runAudit,
    data: mutation.data,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};
