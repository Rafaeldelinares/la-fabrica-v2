/**
 * useGbpAuditHistory — query hook for fetching GBP audit history for a place.
 *
 * Wraps useN8nQuery for the crm-gbp-audit-history-get webhook.
 * Requires gbp.read (enforced at tab level in index.jsx).
 *
 * @since gbp-ficha-improvements S3 (2026-08-06)
 */
import { useN8nQuery } from '../../../../../../shared/hooks/useN8n';

/**
 * @param {string|null} placeId
 * @param {{ limit?: number }} [options]
 */
export const useGbpAuditHistory = (placeId, options = {}) => {
  return useN8nQuery(
    ['gbp-audit-history', placeId],
    'crm-gbp-audit-history-get',
    {
      params: { place_id: placeId || '', limit: options.limit ?? 10 },
      staleTime: 60_000,
      enabled: Boolean(placeId),
    }
  );
};

/**
 * useGbpAuditDrift — query hook for computing drift between last 2 audits.
 *
 * Wraps useN8nQuery for the crm-gbp-audit-drift-get webhook.
 *
 * @param {string|null} placeId
 */
export const useGbpAuditDrift = (placeId) => {
  return useN8nQuery(
    ['gbp-audit-drift', placeId],
    'crm-gbp-audit-drift-get',
    {
      params: { place_id: placeId || '' },
      staleTime: 60_000,
      enabled: Boolean(placeId),
    }
  );
};
