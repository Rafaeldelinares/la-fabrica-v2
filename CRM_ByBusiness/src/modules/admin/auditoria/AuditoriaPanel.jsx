import React, { useState, useEffect } from 'react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import { ClipboardList, RefreshCw, Phone, PhoneOff, PhoneMissed, Calendar, TrendingUp } from 'lucide-react';
import { fmtFechaHora } from '../../../utils/dates';

/** Formatea una duración en segundos como cadena legible (p.ej. "2m 30s"). */
const fmtDuracion = (segundos) => {
  if (!segundos) return '—';
  const minutos = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return minutos > 0 ? `${minutos}m ${seg}s` : `${seg}s`;
};

const RESULTADO_BADGE = {
  venta:        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  callback:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  no_contesta:  'bg-slate-700 text-slate-500 border-slate-600',
  no_interesa:  'bg-red-500/10 text-red-400 border-red-500/20',
  ocupado:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  fuera_zona:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const RESULTADO_ICON = {
  venta:        TrendingUp,
  callback:     Calendar,
  no_contesta:  PhoneMissed,
  no_interesa:  PhoneOff,
  ocupado:      Phone,
  fuera_zona:   PhoneOff,
};

/** Fila de tabla para una llamada individual en el historial de auditoría. */
const FilaLlamada = ({ llamada }) => {
  const Icon = RESULTADO_ICON[llamada.resultado] || Phone;
  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
      <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{fmtFechaHora(llamada.fecha_llamada)}</td>
      <td className="px-4 py-3">
        <p className="font-bold text-slate-200 uppercase text-xs tracking-wide truncate max-w-[160px]">{llamada.nombre_comercial}</p>
        <p className="text-[10px] text-slate-600 font-mono mt-0.5">{llamada.localidad || '—'}</p>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">{llamada.operador_nombre || '—'}</td>
      <td className="px-4 py-3">
        <Badge className={RESULTADO_BADGE[llamada.resultado] || 'bg-slate-800 text-slate-400 border-slate-700'}>
          <span className="flex items-center gap-1">
            <Icon size={9} />
            {llamada.resultado?.replace(/_/g, ' ').toUpperCase() || '—'}
          </span>
        </Badge>
      </td>
      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{fmtDuracion(llamada.duracion_segundos)}</td>
      <td className="px-4 py-3 text-[10px] text-slate-500 max-w-[200px] truncate italic">{llamada.notas || '—'}</td>
    </tr>
  );
};

/** Chip de KPI con etiqueta y valor resaltado en color. */
const KpiChip = ({ label, value, color = 'text-white' }) => (
  <div className="flex flex-col gap-0.5 bg-slate-900 border border-slate-800 rounded-sm px-4 py-2.5">
    <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black">{label}</span>
    <span className={`text-lg font-black font-mono ${color}`}>{value}</span>
  </div>
);

/** Panel de auditoría de llamadas: historial filtrable por operador y resultado con KPIs de conversión. */
const AuditoriaPanel = () => {
  const [llamadas, setLlamadas] = useState(null);
  const [filtroOp, setFiltroOp] = useState('');
  const [filtroRes, setFiltroRes] = useState('');

  const cargar = () => {
    setLlamadas(null);
    const base = import.meta.env.VITE_N8N_URL;
    fetch(`${base}/crm-auditoria-llamadas`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (d.ok) setLlamadas(d.llamadas || []); })
      .catch(() => setLlamadas([]));
  };

  useEffect(cargar, []);

  const operadores = llamadas
    ? [...new Set(llamadas.map(l => l.operador_nombre).filter(Boolean))]
    : [];

  const resultados = llamadas
    ? [...new Set(llamadas.map(l => l.resultado).filter(Boolean))]
    : [];

  const filtradas = (llamadas || []).filter(l =>
    (!filtroOp  || l.operador_nombre === filtroOp) &&
    (!filtroRes || l.resultado === filtroRes)
  );

  // KPIs
  const total       = filtradas.length;
  const ventas      = filtradas.filter(l => l.resultado === 'venta').length;
  const callbacks   = filtradas.filter(l => l.resultado === 'callback').length;
  const durMedia    = filtradas.length
    ? Math.round(filtradas.reduce((s, l) => s + (l.duracion_segundos || 0), 0) / filtradas.length)
    : 0;
  const tasa = total > 0 ? ((ventas / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">AUDITORÍA DE LLAMADAS</h2>
          {llamadas !== null && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-sm border border-slate-700">
              {total} REG.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {operadores.length > 1 && (
            <select
              value={filtroOp}
              onChange={e => setFiltroOp(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase"
            >
              <option value="">Todos los operadores</option>
              {operadores.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          )}
          {resultados.length > 1 && (
            <select
              value={filtroRes}
              onChange={e => setFiltroRes(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase"
            >
              <option value="">Todos los resultados</option>
              {resultados.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ').toUpperCase()}</option>)}
            </select>
          )}
          <button
            onClick={cargar}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm"
          >
            <RefreshCw size={11} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      {llamadas !== null && total > 0 && (
        <div className="flex gap-3 flex-wrap">
          <KpiChip label="Total llamadas"   value={total} />
          <KpiChip label="Ventas"           value={ventas}    color="text-emerald-400" />
          <KpiChip label="Callbacks"        value={callbacks} color="text-blue-400" />
          <KpiChip label="Tasa conversión"  value={`${tasa}%`} color={parseFloat(tasa) >= 10 ? 'text-emerald-400' : 'text-amber-400'} />
          <KpiChip label="Duración media"   value={fmtDuracion(durMedia)} color="text-slate-300" />
        </div>
      )}

      {/* Tabla */}
      <Card className="flex flex-col bg-slate-900 border-slate-800 !p-0 overflow-hidden flex-1">
        {llamadas === null ? (
          <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
            <div className="flex flex-col gap-3 items-center">
              <div className="h-4 w-48 bg-slate-800 rounded-sm" />
              <div className="h-3 w-32 bg-slate-800 rounded-sm" />
            </div>
          </div>
        ) : total === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <EmptyState
              title="Sin registros"
              icon={ClipboardList}
              description="El historial de llamadas del equipo aparecerá aquí"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-mono">FECHA</th>
                  <th className="px-4 py-3">EMPRESA</th>
                  <th className="px-4 py-3">OPERADOR</th>
                  <th className="px-4 py-3">RESULTADO</th>
                  <th className="px-4 py-3 font-mono">DURACIÓN</th>
                  <th className="px-4 py-3">NOTAS</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(llamada => <FilaLlamada key={llamada.id} llamada={llamada} />)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditoriaPanel;
