import React from 'react';
import PropTypes from 'prop-types';

/**
 * Badge de color para match_status en la lista de leads del cron.
 * @param {{ status: string }} props
 */
const StatusBadge = ({ status }) => {
  const cfg = {
    updated:  { cls: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50', label: 'actualizado' },
    no_match: { cls: 'bg-amber-900/40 text-amber-400 border-amber-800/50',     label: 'sin match'   },
    no_rating:{ cls: 'bg-amber-900/40 text-amber-400 border-amber-800/50',     label: 'sin rating'  },
    error:    { cls: 'bg-red-900/40 text-red-400 border-red-800/50',          label: 'error'       },
  };
  const { cls, label } = cfg[status] || cfg.error;
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border rounded-sm ${cls}`}>
      {label}
    </span>
  );
};
StatusBadge.propTypes = { status: PropTypes.string.isRequired };

/**
 * Formatea rating + reviews en una sola cadena.
 * @param {number|null} rating
 * @param {number|null} reviews
 * @returns {string}
 */
const fmtRating = (rating, reviews) => {
  if (rating === null || reviews === null) return '—';
  return `${rating.toFixed(1)} (${reviews})`;
};

/**
 * Lista scrollable de leads dentro del modal EventoDetalle.
 * Muestra nombre_comercial, sector, telefono, rating y status badge.
 * @param {{ leads: Array }} props
 */
const CronSistemaDetalle = ({ leads }) => {
  if (!leads || leads.length === 0) {
    return (
      <p className="text-[10px] text-slate-600 font-mono italic mt-2">
        Sin detalle de leads en este run
      </p>
    );
  }
  return (
    <div className="border-t border-slate-800 pt-3 mt-1">
      <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black mb-2">
        Leads ({leads.length})
      </p>
      <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="flex items-start gap-2 bg-slate-900/50 border border-slate-800 rounded-sm px-2 py-1.5"
          >
            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono font-bold text-slate-200 truncate leading-tight">
                {lead.nombre_comercial}
              </p>
              <p className="text-[9px] font-mono text-slate-500">
                {lead.sector || '—'} · {lead.telefono || '—'}
              </p>
              <p className="text-[9px] font-mono text-slate-600 mt-0.5">
                {lead.localidad || '—'}
              </p>
            </div>
            {/* Rating + badge */}
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className="text-[10px] font-mono text-slate-300">
                {fmtRating(lead.rating_nuevo, lead.reviews_nuevo)}
              </span>
              <StatusBadge status={lead.match_status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

CronSistemaDetalle.propTypes = {
  /** Array de leads con campos: id, nombre_comercial, sector, telefono, localidad, match_status, rating_nuevo, reviews_nuevo */
  leads: PropTypes.arrayOf(PropTypes.object),
};

export default CronSistemaDetalle;
