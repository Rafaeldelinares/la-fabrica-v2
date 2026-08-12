/**
 * GbpAuditTrail — Timeline visual del historial de auditoría del cliente.
 *
 * Lee clientes.gbp_audit_history y muestra los snapshots con:
 *  - Fecha y fuente (cron_daily, manual, etc.)
 *  - Rating, reviews_count, fotos_count
 *  - Delta vs snapshot anterior (con colores)
 *  - Place_id
 *
 * @param {{ snapshots: array }} props
 *   snapshots: [{audited_at, audit_source, scrape_duration_ms, audit_data}]
 *
 * @since gbp-ficha-redesign 2026-08-12
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';

const SOURCE_LABEL = {
  manual: 'Manual',
  'cache-refresh': 'Cache',
  scheduled: 'Programado',
  'pre-audit-v2': 'Pre-Audit v2',
  'pre-audit-v2-resume': 'Pre-Audit v2 (resumed)',
  backfill: 'Backfill',
  'cron_daily': 'Cron diario',
  'cron_weekly': 'Cron semanal',
  webhook: 'Webhook',
};

const GbpAuditTrail = ({ snapshots = [] }) => {
  if (snapshots.length === 0) {
    return (
      <div className="px-5 py-6">
        <p className="text-[11px] font-mono text-slate-600 uppercase tracking-widest mb-2">
          Auditoría
        </p>
        <p className="text-[11px] font-mono text-slate-500">
          Sin snapshots. El cron diario de auditoría inserta el primero.
        </p>
      </div>
    );
  }

  // Sort DESC (newest first)
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.audited_at) - new Date(a.audited_at)
  );

  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">
        Historial de auditoría · {sorted.length} snapshots
      </p>

      <div className="space-y-2">
        {sorted.map((snap, idx) => {
          const prev = sorted[idx + 1];
          const data = snap.audit_data || {};
          const prevData = prev?.audit_data || {};

          const rating = data.rating ?? null;
          const prevRating = prevData.rating ?? null;
          const reviews = data.reviews_count ?? 0;
          const prevReviews = prevData.reviews_count ?? 0;
          const source = snap.audit_source || 'manual';

          const ratingDelta = rating !== null && prevRating !== null
            ? (rating - prevRating).toFixed(1)
            : null;
          const reviewsDelta = reviews - prevReviews;

          const dt = new Date(snap.audited_at);
          const ts = dt.toLocaleString('es-ES', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
          });

          return (
            <div
              key={idx}
              className="bg-slate-900/40 border border-slate-800 rounded-sm p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-slate-500" />
                  <span className="text-[10px] font-mono text-slate-400">
                    {ts}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-600 px-1.5 py-0.5 bg-slate-800 rounded-sm">
                  {SOURCE_LABEL[source] || source}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[9px] font-mono text-slate-600 uppercase">Rating</p>
                  <p className="text-sm font-mono text-slate-200 flex items-center gap-1">
                    {rating !== null ? rating.toFixed(1) : '—'}
                    {ratingDelta !== null && (
                      <span
                        className={`text-[10px] ${
                          parseFloat(ratingDelta) > 0
                            ? 'text-emerald-400'
                            : parseFloat(ratingDelta) < 0
                            ? 'text-red-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {parseFloat(ratingDelta) > 0 ? '↑' : parseFloat(ratingDelta) < 0 ? '↓' : '·'}
                        {Math.abs(parseFloat(ratingDelta)).toFixed(1)}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-600 uppercase">Reviews</p>
                  <p className="text-sm font-mono text-slate-200 flex items-center gap-1">
                    {reviews}
                    {reviewsDelta !== 0 && prev && (
                      <span
                        className={`text-[10px] ${
                          reviewsDelta > 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {reviewsDelta > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {Math.abs(reviewsDelta)}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-600 uppercase">Fotos</p>
                  <p className="text-sm font-mono text-slate-200">
                    {data.fotos_count ?? 0}
                  </p>
                </div>
              </div>

              {data.place_id && (
                <p
                  className="text-[9px] font-mono text-slate-700 truncate mt-1.5"
                  title={data.place_id}
                >
                  {data.place_id}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

GbpAuditTrail.propTypes = {
  snapshots: PropTypes.arrayOf(
    PropTypes.shape({
      audited_at: PropTypes.string,
      audit_source: PropTypes.string,
      audit_data: PropTypes.object,
    })
  ),
};

export default GbpAuditTrail;
