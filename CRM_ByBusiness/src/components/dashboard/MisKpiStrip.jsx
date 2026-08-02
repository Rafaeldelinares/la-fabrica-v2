import React from 'react';
import { Phone, TrendingUp, Percent, Clock } from 'lucide-react';
import { useN8nQuery, n8nGet } from '../../shared/hooks/useN8n';
import Skeleton from '../../shared/ui/Skeleton';

/**
 * Live KPI strip for OperatorDashboard Zone4.
 * Displays 4 real-time metrics: Calls Today, Ventas Hoy,
 * Tasa Conversión, Duración Media. Auto-refreshes every 30s.
 *
 * @param {Object} props
 * @param {number} props.operatorId - ID of the current operator
 * @returns {JSX.Element}
 */
/**
 * Extracts KPI data from the n8n response array.
 * n8n returns: [{json: {calls_hoy, ventas_hoy, duracion_media, tasa_conversion, refreshed_at}}]
 */
const extractKpis = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const kpis = data[0]?.json;
  if (!kpis) return null;
  return {
    calls_today: Number(kpis.calls_hoy ?? 0),
    ventas_hoy: Number(kpis.ventas_hoy ?? 0),
    tasa_conversion: Number(kpis.tasa_conversion ?? 0),
    duracion_media: Number(kpis.duracion_media ?? 0),
    refreshed_at: kpis.refreshed_at,
  };
};

const MisKpiStrip = ({ operatorId }) => {
  const { data, isLoading, dataUpdatedAt, isFetching } = useN8nQuery(
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

  const kpis = [
    {
      label: 'Calls Today',
      value: data?.calls_today ?? 0,
      unit: 'llamadas',
      icon: Phone,
      key: 'calls_today',
    },
    {
      label: 'Ventas Hoy',
      value: data?.ventas_hoy ?? 0,
      unit: 'ventas',
      icon: TrendingUp,
      key: 'ventas_hoy',
    },
    {
      label: 'Tasa Conversión',
      value: data?.tasa_conversion ?? 0,
      unit: '%',
      icon: Percent,
      key: 'tasa_conversion',
    },
    {
      label: 'Duración Media',
      value: data?.duracion_media ?? 0,
      unit: 'min',
      icon: Clock,
      key: 'duracion_media',
    },
  ];

  const formatValue = (kpi, value) => {
    if (kpi.key === 'tasa_conversion') {
      return Number(value).toFixed(1);
    }
    if (kpi.key === 'duracion_media') {
      const mins = Math.floor(Number(value) / 60);
      const secs = Number(value) % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return Number(value).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.key}
            className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3"
          >
            <Skeleton className="h-3 w-20" type="rect" />
            <Skeleton className="h-8 w-16" type="rect" />
          </div>
        ))}
      </div>
    );
  }

  const STALE_THRESHOLD_MS = 60_000;
  const isStale = dataUpdatedAt ? Date.now() - dataUpdatedAt > STALE_THRESHOLD_MS : false;
  const lastRefreshed = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.key}
              className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {kpi.label}
                </span>
                <Icon size={14} className="text-slate-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-white tracking-tight">
                  {formatValue(kpi, kpi.value)}
                </span>
                <span className="text-xs text-slate-500">{kpi.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {lastRefreshed && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] text-slate-600">
            {isStale ? (
              <span className="text-amber-600">Datos posiblemente desactualizados</span>
            ) : (
              `Actualizado ${lastRefreshed}`
            )}
            {isFetching && <span className="ml-2 text-slate-500">[refreshing…]</span>}
          </span>
          <span className="text-[9px] text-slate-700 font-mono">· cada 30s</span>
        </div>
      )}
    </div>
  );
};

export default MisKpiStrip;
