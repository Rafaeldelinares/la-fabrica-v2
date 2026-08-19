/**
 * GbpCompetitiveAnalysis — competitor benchmark display.
 *
 * Shows cliente vs sector competitors across key Google Places metrics.
 * Integrates with existing GBP audit flow via useGbpCompetitiveAnalysis.
 *
 * @since gbp-competitive S2B (2026-08-07)
 */
import React from 'react';
import PropTypes from 'prop-types';
import { RefreshCw, AlertTriangle, Minus } from 'lucide-react';
import { useGbpCompetitiveAnalysis } from './hooks/useGbpCompetitiveAnalysis';

/** Delta badge: green positive, red negative, amber neutral. */
const Delta = ({ value, suffix = '', decimals = 0 }) => {
  if (value == null) return <Minus size={10} className="text-slate-600 inline" />;
  const formatted = decimals > 0 ? Number(value).toFixed(decimals) : Math.round(Number(value));
  const display = formatted;
  const cls = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-amber-400';
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`text-xs font-mono ${cls}`}>
      {sign}{display}{suffix}
    </span>
  );
};
Delta.propTypes = { value: PropTypes.number, suffix: PropTypes.string, decimals: PropTypes.number };

/** Summary delta row for a single metric. */
const MetricDelta = ({ label, clienteVal, avgVal, delta, suffix = '', decimals = 0 }) => (
  <div className="flex items-center justify-between gap-4 px-2 py-1 bg-slate-900/60 rounded-sm border border-slate-800">
    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-slate-300">{decimals > 0 ? Number(clienteVal).toFixed(decimals) : clienteVal}{suffix}</span>
      <span className="text-[10px] font-mono text-slate-600">vs {decimals > 0 ? Number(avgVal).toFixed(decimals) : avgVal}{suffix}</span>
      <Delta value={delta} suffix={suffix} decimals={decimals} />
    </div>
  </div>
);
MetricDelta.propTypes = {
  label: PropTypes.string.isRequired,
  clienteVal: PropTypes.number,
  avgVal: PropTypes.number,
  delta: PropTypes.number,
  suffix: PropTypes.string,
  decimals: PropTypes.number,
};

/** Ranking badge. */
const RankingBadge = ({ rank, total }) => {
  if (rank == null || total == null) return null;
  const isTop = rank === 1;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[10px] font-mono ${
      isTop
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        : 'bg-slate-800 text-slate-400 border-slate-700'
    }`}>
      <span className="text-xs font-bold">{rank}º</span>
      <span className="text-slate-500">/</span>
      <span className="text-slate-400">{total}</span>
      <span className="text-slate-600">en rating</span>
    </div>
  );
};
RankingBadge.propTypes = { rank: PropTypes.number, total: PropTypes.number };

/** Table column header. */
const Th = ({ children, className = '' }) => (
  <th className={`text-[9px] font-mono text-slate-600 uppercase tracking-widest px-2 py-1 text-left ${className}`}>{children}</th>
);
Th.propTypes = { children: PropTypes.node, className: PropTypes.string };

/** Table cell. */
const Td = ({ children, className = '' }) => (
  <td className={`px-2 py-1.5 text-xs font-mono text-slate-300 ${className}`}>{children}</td>
);
Td.propTypes = { children: PropTypes.node, className: PropTypes.string };

/** One row in the competitors table. */
const TableRow = ({ item, isCliente = false, avgCompetitors = {} }) => {
  const deltaClass = (val, avg, _suffix = '') => {
    if (val == null || avg == null) return 'text-slate-500';
    const d = val - avg;
    return d > 0 ? 'text-emerald-400' : d < 0 ? 'text-red-400' : 'text-slate-400';
  };
  const rowClass = isCliente
    ? 'bg-[#D00000]/5 border-l-2 border-[#D00000]'
    : 'bg-slate-900/50';
  return (
    <tr className={`${rowClass}`}>
      <Td className="font-bold text-slate-200 max-w-[140px] truncate">{item.name}</Td>
      <Td>
        <span className={deltaClass(item.rating, avgCompetitors.rating)}>
          {item.rating != null ? Number(item.rating).toFixed(1) : '—'}
        </span>
      </Td>
      <Td>
        <span className={deltaClass(item.fotos_count, avgCompetitors.fotos_avg)}>
          {item.fotos_count ?? 0}
        </span>
      </Td>
      <Td>
        <span className={deltaClass(item.reviews_count, avgCompetitors.reviews_avg)}>
          {item.reviews_count ?? 0}
        </span>
      </Td>
      <Td>
        <span className={deltaClass(item.reviews_respondidas_pct, avgCompetitors.responded_pct_avg)}>
          {item.reviews_respondidas_pct != null ? `${Math.round(item.reviews_respondidas_pct)}%` : '—'}
        </span>
      </Td>
      <Td>{item.horarios_dias_cubiertos ?? 0}d</Td>
      <Td>
        <span className="text-slate-500">{item.atributos_seteados ?? 0}/{item.atributos_total ?? 0}</span>
      </Td>
    </tr>
  );
};
TableRow.propTypes = { item: PropTypes.object, isCliente: PropTypes.bool, avgCompetitors: PropTypes.object };

/** Loading skeleton. */
const SkeletonRows = () => (
  <div className="flex flex-col gap-1.5 py-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-6 bg-slate-800/40 rounded-sm animate-pulse" />
    ))}
  </div>
);

/**
 * GbpCompetitiveAnalysis component.
 *
 * @param {object} props
 * @param {string|number} props.clienteId
 * @param {object}       [props.existingAudit] — not required; competitive data is independent
 */
export default function GbpCompetitiveAnalysis({ clienteId, _existingAudit }) {
  const { data, isLoading, error, refetch, isFetching } = useGbpCompetitiveAnalysis(clienteId);

  // Error from workflow response (ok: false)
  const workflowError = data && data.ok === false ? data : null;

  // Network-level error from React Query
  const networkError = error ? error.message || 'Error de conexión' : null;

  const errorMessage = workflowError
    ? workflowError.error === 'sin_google_cid'
      ? 'Este cliente no tiene Google Place ID. Asígnale uno primero.'
      : workflowError.message || 'Error desconocido'
    : networkError;

  const hasData = data && data.ok === true;

  const summary = hasData ? data.summary : null;
  const cliente = hasData ? data.cliente : null;
  const competitors = hasData ? (data.competitors || []) : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
          Competencia en tu sector
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching || isLoading}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-700 rounded-sm hover:text-slate-300 hover:border-slate-600 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Cargando…' : 'Refresh'}
        </button>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-950/20 border border-red-900/40 rounded-sm">
          <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400 font-mono">{errorMessage}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <SkeletonRows />}

      {/* Empty / no-data state */}
      {!hasData && !errorMessage && !isLoading && (
        <p className="text-[10px] text-slate-600 font-mono text-center py-4 border border-dashed border-slate-800 rounded-sm">
          Click «Comparar con sector» para cargar datos competitivos.
        </p>
      )}

      {/* Loaded state */}
      {hasData && summary && (
        <div className="flex flex-col gap-3">
          {/* Summary deltas */}
          <div className="flex flex-col gap-1">
            <MetricDelta
              label="Rating"
              clienteVal={cliente?.rating}
              avgVal={summary.rating_avg_competitors}
              delta={summary.rating_delta_vs_avg}
              suffix=""
              decimals={1}
            />
            <MetricDelta
              label="Fotos"
              clienteVal={cliente?.fotos_count}
              avgVal={summary.fotos_avg_competitors}
              delta={summary.fotos_delta_vs_avg}
              suffix=""
            />
            <MetricDelta
              label="Reviews"
              clienteVal={cliente?.reviews_count}
              avgVal={summary.reviews_avg_competitors}
              delta={summary.reviews_delta_vs_avg}
              suffix=""
            />
            <MetricDelta
              label="% Resp."
              clienteVal={cliente?.reviews_respondidas_pct}
              avgVal={summary.responded_pct_avg_competitors}
              delta={summary.responded_pct_delta_vs_avg}
              suffix="%"
            />
          </div>

          {/* Ranking + attrs */}
          <div className="flex items-center gap-2 flex-wrap">
            <RankingBadge rank={summary.rating_rank} total={summary.rating_total} />
            <span className="text-[10px] font-mono text-slate-600">
              {cliente?.atributos_seteados ?? '?'}/{cliente?.atributos_total ?? '?'} atributos
            </span>
            <span className="text-[10px] font-mono text-slate-600">
              {cliente?.horarios_dias_cubiertos ?? '?'}d horarios
            </span>
          </div>

          {/* Competitors table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  <Th className="w-[140px]">Nombre</Th>
                  <Th>Rating</Th>
                  <Th>Fotos</Th>
                  <Th>Reviews</Th>
                  <Th>% Resp.</Th>
                  <Th>Días</Th>
                  <Th>Atrib.</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cliente && (
                  <TableRow
                    item={cliente}
                    isCliente
                    avgCompetitors={{
                      rating: summary.rating_avg_competitors,
                      fotos_avg: summary.fotos_avg_competitors,
                      reviews_avg: summary.reviews_avg_competitors,
                      responded_pct_avg: summary.responded_pct_avg_competitors,
                    }}
                  />
                )}
                {competitors.map((comp, i) => (
                  <TableRow
                    key={comp.place_id || i}
                    item={comp}
                    avgCompetitors={{
                      rating: summary.rating_avg_competitors,
                      fotos_avg: summary.fotos_avg_competitors,
                      reviews_avg: summary.reviews_avg_competitors,
                      responded_pct_avg: summary.responded_pct_avg_competitors,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

GbpCompetitiveAnalysis.propTypes = {
  clienteId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  existingAudit: PropTypes.object,
};
