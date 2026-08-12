/**
 * GbpSectorCard — Comparación del cliente con su sector y competidores cercanos.
 *
 * Lee de clientes.competencia + sector_aggregates (sprint paralelo).
 * Muestra:
 *  - Posición del cliente (top X% vs sector)
 *  - Rating promedio del sector
 *  - Reviews promedio del sector
 *  - Top 3 competidores (nombre, rating, reviews)
 *
 * @param {{ cliente }} props
 *
 * @since gbp-ficha-redesign 2026-08-12
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useN8nQuery } from '../../../../../shared/hooks/useN8n';

const GbpSectorCard = ({ cliente }) => {
  // Fetch últimos datos de competencia y sector
  const { data: compData } = useN8nQuery(
    ['gbp-sector-competencia', cliente.id],
    'crm-gbp-ficha-sector-get',
    { params: { cliente_id: String(cliente.id) }, staleTime: 5 * 60_000 }
  );

  if (!compData?.ok) {
    return (
      <div className="px-5 py-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">
          Sector
        </p>
        <p className="text-[11px] font-mono text-slate-500">
          Sin datos de sector. El cron semanal de audit-competencia debe ejecutarse primero.
        </p>
      </div>
    );
  }

  const { competitors_count, competitors_avg_rating, competitors_avg_reviews,
          client_rating, client_reviews, position_pct, raw_competitors } = compData;

  const competitors = Array.isArray(raw_competitors) ? raw_competitors.slice(0, 3) : [];

  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">
        Posición en sector · últimos 7 días
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[9px] font-mono text-slate-600 uppercase">Posición</p>
          <p className="text-2xl font-mono font-black text-slate-200">
            {position_pct !== undefined ? `${position_pct.toFixed(0)}%` : '—'}
            <span className="text-[10px] text-slate-600 ml-1">mejor que competencia</span>
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-600 uppercase">Competidores en zona</p>
          <p className="text-2xl font-mono font-black text-slate-200">
            {competitors_count ?? '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-900/40 border border-slate-800 rounded-sm p-3">
        <div>
          <p className="text-[9px] font-mono text-slate-600 uppercase">Tu rating</p>
          <p className="text-lg font-mono font-bold text-slate-200">
            {client_rating !== null && client_rating !== undefined ? client_rating.toFixed(1) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-600 uppercase">Avg sector</p>
          <p className="text-lg font-mono font-bold text-slate-400">
            {competitors_avg_rating !== null && competitors_avg_rating !== undefined
              ? competitors_avg_rating.toFixed(1) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-600 uppercase">Tus reviews</p>
          <p className="text-lg font-mono font-bold text-slate-200">
            {client_reviews ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-600 uppercase">Avg sector</p>
          <p className="text-lg font-mono font-bold text-slate-400">
            {competitors_avg_reviews ?? '—'}
          </p>
        </div>
      </div>

      {competitors.length > 0 && (
        <div>
          <p className="text-[9px] font-mono text-slate-600 uppercase mb-2">Top competidores</p>
          <div className="space-y-1.5">
            {competitors.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-900/30 border border-slate-800 rounded-sm px-2 py-1.5">
                <span className="text-[11px] font-mono text-slate-200 truncate flex-1">
                  {c.name || c.title || 'Competidor'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 ml-2">
                  ★ {c.rating?.toFixed(1) ?? '—'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 ml-1">
                  ({c.reviews ?? 0})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

GbpSectorCard.propTypes = {
  cliente: PropTypes.object.isRequired,
};

export default GbpSectorCard;
