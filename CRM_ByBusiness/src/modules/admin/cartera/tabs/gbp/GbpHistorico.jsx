/**
 * GbpHistorico — Audit history timeline (placeholder for S3).
 *
 * S3 will implement real history timeline + drift detection.
 * This placeholder shows an empty state.
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Clock } from 'lucide-react';

/**
 * @param {{ placeId?: string|null }} props
 */
const GbpHistorico = ({ placeId }) => {
  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Empty state — S3 replaces this with real timeline */}
      <div className="flex flex-col items-center gap-2 py-6 text-center border border-dashed border-slate-800 rounded-sm">
        <Clock size={20} className="text-slate-700" />
        <div>
          <p className="text-[10px] text-slate-600 font-mono">
            Sin histórico disponible
          </p>
          <p className="text-[9px] text-slate-700 font-mono mt-1">
            S3: Se mostrarán las auditorías anteriores con drift.
          </p>
        </div>
      </div>

      {/* Placeholder for drift items when history is empty */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
          Drift (próximo en S3)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {['fotos_added', 'reviews_delta', 'rating_delta', 'desc_changed'].map((key) => (
            <div key={key}
              className="bg-slate-900 border border-slate-800 rounded-sm px-2 py-1.5 flex items-center justify-between">
              <span className="text-[9px] text-slate-600 font-mono">{key}</span>
              <span className="text-[10px] text-slate-700 font-mono">—</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

GbpHistorico.propTypes = {
  placeId: PropTypes.string,
};

export default GbpHistorico;
