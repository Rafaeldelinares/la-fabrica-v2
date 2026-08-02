import { useN8nQuery, n8nGet } from '../../shared/hooks/useN8n';
import { extractKpis } from './MisKpiStrip.helpers';

/**
 * Hook that fetches live KPI data for an operator.
 *
 * @param {number|null} operatorId - ID of the operator to fetch KPIs for
 * @returns {{ kpis: object|null, isLoading: boolean, isFetching: boolean, dataUpdatedAt: number, refetch: Function }}
 */
const useKpiStripLogic = (operatorId) => {
  const { data, isLoading, dataUpdatedAt, isFetching, refetch } = useN8nQuery(
    ['kpis-live', operatorId],
    'crm-operador-kpi-live',
    {
      queryFn: () => n8nGet('crm-operador-kpi-live', { operador_id: operatorId }),
      refetchInterval: 30_000,
      staleTime: 60_000,
      enabled: Boolean(operatorId),
      select: extractKpis,
    }
  );

  return { kpis: data, isLoading, isFetching, dataUpdatedAt, refetch };
};

export { useKpiStripLogic };
