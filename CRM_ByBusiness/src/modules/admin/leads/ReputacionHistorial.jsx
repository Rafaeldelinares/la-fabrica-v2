import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { n8nPost } from '../../../shared/hooks/useN8n';

/** Format ISO timestamp to DD/MM/YYYY */
const fmtFecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/**
 * ReputacionHistorial — muestra últimos 5 cambios de reputación para un lead.
 * Se usa dentro de ClienteSidePanel para clientes que tienen lead_id.
 * @param {{ leadId: number }} props
 */
const ReputacionHistorial = ({ leadId }) => {
  const { data: repData } = useQuery({
    queryKey: ['reputacion-historial', leadId],
    queryFn: () => n8nPost('crm-lead-reputacion-historial', { lead_id: leadId }),
    enabled: !!leadId,
    staleTime: 60_000,
  });

  if (!repData?.historial?.length) return null;

  return (
    <div>
      <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
        Reputación — últimos cambios
      </p>
      <div className="mt-1 flex flex-col gap-1">
        {repData.historial.slice(0, 5).map((h) => {
          const delta = h.delta_rating != null ? h.delta_rating : (h.rating_new - (h.rating_old || 0));
          const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '·';
          const colorClass = delta > 0
            ? 'text-emerald-400'
            : delta < 0
              ? 'text-[#D00000]'
              : 'text-slate-500';
          return (
            <div key={h.id} className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">{fmtFecha(h.scraped_at)}</span>
              <span className="text-slate-300">
                {h.rating_old != null ? h.rating_old.toFixed(1) : '—'} → {h.rating_new.toFixed(1)}
              </span>
              <span className={colorClass}>
                {arrow} {Math.abs(delta || 0).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

ReputacionHistorial.propTypes = {
  leadId: PropTypes.number.isRequired,
};

export default ReputacionHistorial;
