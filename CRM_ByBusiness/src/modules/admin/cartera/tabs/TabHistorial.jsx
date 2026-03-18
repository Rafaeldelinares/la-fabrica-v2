import React from 'react';
import PropTypes from 'prop-types';
import { Clock } from 'lucide-react';
import { fmtFechaHora } from '../../../../utils/dates';

const TIPO_EVENTO = {
  interaccion: { llamada: '📞', email: '✉️', reunion: '🤝', nota: '📝', acuerdo: '✅' },
};

const TIPO_COLOR = {
  interaccion: 'border-slate-700 bg-slate-900/50',
  llamada:     'border-slate-800 bg-slate-950/50',
};

const iconEvento = (ev) => {
  if (ev.tipo_evento === 'llamada') return '📱';
  return TIPO_EVENTO.interaccion[ev.tipo] || '📋';
};

/**
 * TabHistorial — Pestaña de historial cronológico de interacciones del cliente.
 * El botón de añadir interacción lo gestiona ClienteDrawer directamente.
 * @param {{ timeline: Array|null }} props
 */
const TabHistorial = ({ timeline }) => {
  if (timeline === null) return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-800/40 rounded-sm animate-pulse" />)}
    </div>
  );

  if (timeline.length === 0) return (
    <div className="text-center py-10">
      <p className="text-slate-600 text-xs font-mono">Sin interacciones registradas</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {timeline.map((ev, i) => (
        <div key={ev.evento_id || i} className={`border rounded-sm p-3 ${TIPO_COLOR[ev.tipo_evento] || TIPO_COLOR.interaccion}`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">{iconEvento(ev)}</span>
              <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wide">{ev.tipo}</span>
              {ev.tipo_evento === 'llamada' && ev.resultado && (
                <span className="text-[9px] font-mono bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-sm text-slate-500 uppercase">
                  {ev.resultado}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-600 font-mono shrink-0">
              <Clock size={10} />
              {fmtFechaHora(ev.fecha_evento)}
            </div>
          </div>
          {ev.resumen && <p className="text-xs text-slate-300 leading-relaxed mt-1">{ev.resumen}</p>}
          {ev.acuerdo_alcanzado && <p className="text-[11px] text-emerald-400/80 font-mono mt-1.5">✅ {ev.acuerdo_alcanzado}</p>}
          {ev.proxima_accion && <p className="text-[11px] text-amber-400/80 font-mono mt-1">→ {ev.proxima_accion}</p>}
          {ev.autor && <p className="text-[10px] text-slate-600 font-mono mt-1.5">{ev.autor}</p>}
        </div>
      ))}
    </div>
  );
};

TabHistorial.propTypes = {
  timeline: PropTypes.array,
};

export default TabHistorial;
