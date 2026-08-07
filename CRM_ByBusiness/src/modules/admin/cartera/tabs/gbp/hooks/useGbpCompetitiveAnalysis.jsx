/**
 * useGbpCompetitiveAnalysis — query hook for competitive benchmark data.
 *
 * Wraps useQuery + n8nPost for the crm-gbp-competitive-analysis webhook.
 * Returns cliente vs competitor metrics from Google Places data.
 *
 * @since gbp-competitive S2B (2026-08-07)
 */
import { useQuery } from '@tanstack/react-query';
import { n8nPost } from '../../../../../../shared/hooks/useN8n';

/**
 * @param {string|number|null} clienteId
 */
export const useGbpCompetitiveAnalysis = (clienteId) => {
  return useQuery({
    queryKey: ['gbp-competitive', clienteId],
    queryFn: () => n8nPost('crm-gbp-competitive-analysis', { cliente_id: Number(clienteId) }),
    staleTime: 60 * 60 * 1_000, // 60 min — competitive data is slow-changing
    enabled: Boolean(clienteId),
    retry: 1,
  });
};
