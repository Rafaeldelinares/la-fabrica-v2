/**
 * GbpHistorico — Audit history timeline with drift detection.
 * Requires gbp.read (enforced at tab level in index.jsx).
 * @since gbp-ficha-improvements S3 (2026-08-06)
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGbpAuditHistory, useGbpAuditDrift } from './hooks/useGbpAuditHistory';

const SOURCE_COLORS = {
  manual: 'bg-slate-800 text-slate-300 border-slate-700',
  'cache-refresh': 'bg-amber-900 text-amber-300 border-amber-800',
  scheduled: 'bg-blue-900 text-blue-300 border-blue-800',
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const DeltaBadge = ({ label, value, unit = '' }) => {
  if (value === null || value === undefined) return null;
  const isPos = value > 0;
  const isNeg = value < 0;
  const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
  const color = isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-slate-500';
  return (
    <div className="flex items-center gap-1">
      <Icon size={10} className={color} />
      <span className={`text-[10px] font-mono ${color}`}>
        {label}: {isPos ? '+' : ''}{value}{unit}
      </span>
    </div>
  );
};

const HistoryRow = ({ row }) => {
  const { audit_data: audit, audit_source: source, audited_at: at } = row;
  const color = SOURCE_COLORS[source] || SOURCE_COLORS.manual;
  return (
    <div className="border border-slate-800 rounded-sm p-3 flex flex-col gap-2 bg-slate-950">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-mono px-1.5 py-0.5 border rounded-sm ${color}`}>
          {source}
        </span>
        <span className="text-[9px] text-slate-600 font-mono">{fmtDate(at)}</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {[
          [audit?.rating, '★'],
          [audit?.reviews_count, '📋'],
          [audit?.fotos_count, '📷'],
          [audit?.qa_count, '❓'],
        ].map(([val, icon], i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-mono">{val ?? '—'}</span>
            <span className="text-[8px] text-slate-700">{icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const EmptyState = ({ message, sub }) => (
  <div className="flex flex-col items-center gap-2 py-6 text-center border border-dashed border-slate-800 rounded-sm">
    <Clock size={20} className="text-slate-700" />
    <div>
      <p className="text-[10px] text-slate-600 font-mono">{message}</p>
      {sub && <p className="text-[9px] text-slate-700 font-mono mt-1">{sub}</p>}
    </div>
  </div>
);

const GbpHistorico = ({ placeId }) => {
  const { data: histData, isLoading } = useGbpAuditHistory(placeId);
  const { data: driftData } = useGbpAuditDrift(placeId);

  if (!placeId) return (
    <div className="flex flex-col gap-3 py-2">
      <EmptyState message="Sin place_id seleccionado" />
    </div>
  );

  if (isLoading) return (
    <div className="flex flex-col gap-3 py-2">
      {[1, 2].map((i) => (
        <div key={i} className="h-20 bg-slate-900 rounded-sm animate-pulse border border-slate-800" />
      ))}
    </div>
  );

  const history = histData?.history || [];

  if (history.length === 0) return (
    <div className="flex flex-col gap-3 py-2">
      <EmptyState message="Primer registro — sin histórico" sub="La primera auditoría crea el histórico." />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex flex-col gap-2">
        <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">
          Histórico ({history.length} registros)
        </p>
        {history.map((row) => <HistoryRow key={row.audit_id} row={row} />)}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">Drift</p>
        {driftData?.has_previous === false ? (
          <div className="border border-dashed border-slate-800 rounded-sm px-3 py-2">
            <p className="text-[10px] text-slate-600 font-mono">Primer registro — sin histórico</p>
          </div>
        ) : driftData?.has_previous ? (
          <div className="border border-slate-800 rounded-sm p-3 bg-slate-950 flex flex-col gap-1.5">
            <p className="text-[9px] text-slate-700 font-mono mb-1">
              {driftData?.periodo?.from
                ? `${fmtDate(driftData.periodo.from)} → ${fmtDate(driftData.periodo.to)}`
                : 'Período no disponible'}
            </p>
            <DeltaBadge label="★ rating" value={driftData?.rating_delta} />
            <DeltaBadge label="reviews" value={driftData?.reviews_count_delta} />
            <DeltaBadge label="fotos" value={driftData?.fotos_added} />
            <DeltaBadge label="❓ respondidas" value={driftData?.reviews_respondidas_delta} />
            {driftData?.descripcion_changed && (
              <span className="text-[10px] text-amber-400 font-mono mt-1">
                ⚠ descripción cambió
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

GbpHistorico.propTypes = { placeId: PropTypes.string };
export default GbpHistorico;
