/**
 * useGbpFichas — query hook for fetching GBP fichas for a cliente.
 *
 * Wraps useN8nQuery for the crm-gbp-fichas-cliente webhook.
 * Requires gbp.read (enforced at tab level in index.jsx).
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import { useN8nQuery } from '../../../../../../shared/hooks/useN8n';

/**
 * @param {string|number} clienteId
 */
export const useGbpFichas = (clienteId) => {
  return useN8nQuery(
    ['gbp-fichas', clienteId],
    'crm-gbp-fichas-cliente',
    {
      params: { cliente_id: String(clienteId) },
      staleTime: 60_000,
      enabled: Boolean(clienteId),
    }
  );
};
