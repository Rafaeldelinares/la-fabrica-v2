/**
 * GbpHeatmapActividad — Mini heatmap 24×7 con popular_times del último audit.
 *
 * Lee audit_data.popular_times del último scrape del cliente.
 * Renderiza grid 7 días × 24 horas con intensity 0-100%.
 *
 * @param {{ audit: object|null }} props
 *   audit: { popular_times: { 0: [[h00, p00], [h01, p01], ...], 1: [...], ... } }
 *
 * @since gbp-ficha-redesign 2026-08-12
 */
import React from 'react';
import PropTypes from 'prop-types';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const colorFor = (pct) => {
  if (pct === null || pct === undefined) return 'bg-slate-900';
  if (pct >= 80) return 'bg-rose-500';
  if (pct >= 60) return 'bg-rose-400';
  if (pct >= 40) return 'bg-amber-500';
  if (pct >= 20) return 'bg-amber-400';
  if (pct >= 5) return 'bg-emerald-500/40';
  return 'bg-emerald-900';
};

const GbpHeatmapActividad = ({ audit }) => {
  if (!audit) {
    return (
      <div className="px-5 py-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">
          Heatmap de actividad
        </p>
        <p className="text-[11px] font-mono text-slate-500">
          Sin datos. Ejecuta el audit para capturar popular_times.
        </p>
      </div>
    );
  }

  const popularTimes = audit.popular_times;
  if (!popularTimes || typeof popularTimes !== 'object') {
    return (
      <div className="px-5 py-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">
          Heatmap de actividad
        </p>
        <p className="text-[11px] font-mono text-slate-500">
          popular_times no disponible en este audit.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">
        Actividad típica · popular_times
      </p>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header con horas */}
          <div className="grid grid-cols-[40px_repeat(24,minmax(10px,1fr))] gap-0.5 text-[8px] font-mono">
            <div></div>
            {HOURS.map((h) => (
              <div key={h} className="text-center text-slate-600">
                {h % 6 === 0 ? h : ''}
              </div>
            ))}

            {/* Grid 7 días */}
            {DAYS.map((dayName, dayIdx) => {
              const dayData = popularTimes[dayIdx];
              return (
                <React.Fragment key={dayIdx}>
                  <div className="text-right pr-2 text-slate-500 self-center text-[10px]">
                    {dayName}
                  </div>
                  {HOURS.map((h) => {
                    const pct = dayData?.[h]?.[1] ?? null;
                    return (
                      <div
                        key={h}
                        title={`${dayName} ${h}:00 — ${pct ?? 'N/A'}%`}
                        className={`h-4 rounded-sm ${colorFor(pct)} ${
                          pct !== null ? 'opacity-80' : 'opacity-20'
                        }`}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[9px] font-mono text-slate-500">
        <span>Baja</span>
        <div className="flex h-2">
          <div className="w-3 bg-emerald-900" />
          <div className="w-3 bg-emerald-500/40" />
          <div className="w-3 bg-amber-400" />
          <div className="w-3 bg-amber-500" />
          <div className="w-3 bg-rose-400" />
          <div className="w-3 bg-rose-500" />
        </div>
        <span>Alta</span>
      </div>
    </div>
  );
};

GbpHeatmapActividad.propTypes = {
  audit: PropTypes.shape({
    popular_times: PropTypes.object,
  }),
};

export default GbpHeatmapActividad;
