import React from 'react';
import { Phone, TrendingUp, Percent, Clock } from 'lucide-react';
import Skeleton from '../../shared/ui/Skeleton';
import { useKpiStripLogic } from './useKpiStripLogic';
import { formatValue } from './MisKpiStrip.helpers';

/**
 * Live KPI strip for OperatorDashboard Zone4.
 * Displays 4 real-time metrics: Calls Today, Ventas Hoy,
 * Tasa Conversión, Duración Media. Auto-refreshes every 30s.
 *
 * @param {Object} props
 * @param {number} props.operatorId - ID of the current operator
 * @returns {JSX.Element}
 */
const MisKpiStrip = ({ operatorId }) => {
  const { kpis, isLoading, isFetching, dataUpdatedAt, refetch } = useKpiStripLogic(operatorId);

  const kpiDescriptors = [
    { label: 'Calls Today',  unit: 'llamadas', icon: Phone,      key: 'calls_today' },
    { label: 'Ventas Hoy',   unit: 'ventas',   icon: TrendingUp, key: 'ventas_hoy' },
    { label: 'Tasa Conversión', unit: '%',     icon: Percent,    key: 'tasa_conversion' },
    { label: 'Duración Media', unit: 'min',    icon: Clock,      key: 'duracion_media' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {kpiDescriptors.map((kpi) => (
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
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-3">
        {kpiDescriptors.map((kpi) => {
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
                  {formatValue(kpi, kpis?.[kpi.key] ?? 0)}
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
