import React, { useState, useEffect } from 'react';
import Card from '../../shared/ui/Card';
import { TrendingUp, Phone, ShoppingBag, Star, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { n8nGet } from '../../shared/hooks/useN8n';

const Stat = ({ label, value, color = 'text-white', suffix = '' }) => (
  <div className="bg-slate-950 border border-slate-800 rounded-sm p-3 flex flex-col gap-1">
    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">{label}</p>
    <p className={`text-xl font-black font-mono ${color}`}>{value ?? '—'}{suffix}</p>
  </div>
);

const MiniBar = ({ value, max, color = 'bg-[#D00000]' }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
    <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{value ?? 0}</span>
  </div>
);

const CurvaLinea = ({ sesiones }) => {
  if (!sesiones?.length) return null;
  const puntos = sesiones.filter(s => s.media_punt !== null);
  if (puntos.length < 2) return (
    <p className="text-[10px] text-slate-600 font-mono text-center py-4">Se necesitan al menos 2 sesiones evaluadas para ver la curva</p>
  );

  const maxPunt = 10;
  const w = 400, h = 80, pad = 10;
  const xStep = (w - pad * 2) / (puntos.length - 1);

  const coords = puntos.map((s, i) => ({
    x: pad + i * xStep,
    y: h - pad - ((s.media_punt / maxPunt) * (h - pad * 2)),
    val: s.media_punt,
    apto: s.apto,
  }));

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        {/* Grid lines */}
        {[2, 4, 6, 8, 10].map(v => {
          const y = h - pad - ((v / maxPunt) * (h - pad * 2));
          return (
            <g key={v}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#1e293b" strokeWidth="1" />
              <text x={pad - 2} y={y + 3} fill="#475569" fontSize="6" textAnchor="end">{v}</text>
            </g>
          );
        })}
        {/* Line */}
        <path d={path} fill="none" stroke="#D00000" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Points */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="3" fill={c.apto ? '#10b981' : '#D00000'} />
            <text x={c.x} y={c.y - 5} fill="#94a3b8" fontSize="6" textAnchor="middle">{c.val}</text>
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-1 justify-center">
        <span className="flex items-center gap-1 text-[9px] text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Apto</span>
        <span className="flex items-center gap-1 text-[9px] text-[#D00000]"><span className="w-2 h-2 rounded-full bg-[#D00000] inline-block" /> No apto / sin evaluar</span>
      </div>
    </div>
  );
};

const FilaSesion = ({ s, idx }) => {
  const media = s.media_punt;
  const mediaColor = media >= 7 ? 'text-emerald-400' : media >= 5 ? 'text-amber-400' : 'text-red-400';

  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
      <td className="px-3 py-2 font-mono text-slate-600 text-[10px]">#{idx + 1}</td>
      <td className="px-3 py-2 font-mono text-[10px] text-slate-400">
        {new Date(s.fecha_inicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
      </td>
      <td className="px-3 py-2 font-mono text-[10px] text-white">{s.llamadas}</td>
      <td className="px-3 py-2 font-mono text-[10px] text-emerald-400">{s.ventas}</td>
      <td className="px-3 py-2 font-mono text-[10px] text-blue-400">{s.tasa_conversion}%</td>
      <td className="px-3 py-2 font-mono text-[10px]">
        {media ? <span className={`font-black ${mediaColor}`}>{media}/10</span> : <span className="text-slate-700">—</span>}
      </td>
      <td className="px-3 py-2">
        {s.apto === true && <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-black"><CheckCircle size={9} /> APTO</span>}
        {s.apto === false && <span className="flex items-center gap-1 text-[9px] text-slate-500 font-black"><XCircle size={9} /> NO APTO</span>}
        {s.apto === null && <span className="text-[9px] text-slate-700">—</span>}
      </td>
      <td className="px-3 py-2 text-[10px] text-slate-600 italic max-w-32 truncate">{s.comentarios || ''}</td>
    </tr>
  );
};

const HistorialProgreso = ({ user }) => {
  const [data, setData] = useState(null);

  const cargar = () => {
    setData(null);
    n8nGet('crm-historial-operador', { operador_id: user.id })
      .then(d => { if (d.ok) setData(d); })
      .catch(() => setData({ sesiones: [], resumen: {} }));
  };

  useEffect(cargar, [user.id]); // eslint-disable-line react-hooks/set-state-in-effect

  if (data === null) return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-20 bg-slate-800 rounded-sm" />
      <div className="h-40 bg-slate-800 rounded-sm" />
    </div>
  );

  const { sesiones = [], resumen = {} } = data;

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-[#D00000]" />
          <h3 className="text-xs font-black text-white uppercase tracking-widest">Mi progreso</h3>
        </div>
        <button onClick={cargar} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-sm">
          <RefreshCw size={10} /> Actualizar
        </button>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sesiones"       value={resumen.total_sesiones}    color="text-white" />
        <Stat label="Llamadas"       value={resumen.total_llamadas}     color="text-white" />
        <Stat label="Ventas"         value={resumen.total_ventas}       color="text-emerald-400" />
        <Stat label="Conversión"     value={resumen.tasa_conversion}    color="text-blue-400" suffix="%" />
      </div>

      {/* Puntuaciones medias */}
      {(resumen.media_argumentacion || resumen.media_objeciones || resumen.media_cierre) && (
        <Card className="bg-slate-900 border-slate-800 p-4">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-3">Puntuaciones medias del evaluador</p>
          <div className="flex flex-col gap-2">
            <div><p className="text-[9px] text-slate-600 mb-1">Argumentación</p><MiniBar value={resumen.media_argumentacion} max={10} /></div>
            <div><p className="text-[9px] text-slate-600 mb-1">Objeciones</p><MiniBar value={resumen.media_objeciones} max={10} color="bg-blue-600" /></div>
            <div><p className="text-[9px] text-slate-600 mb-1">Cierre</p><MiniBar value={resumen.media_cierre} max={10} color="bg-emerald-600" /></div>
          </div>
        </Card>
      )}

      {/* Curva de mejora */}
      {sesiones.length > 0 && (
        <Card className="bg-slate-900 border-slate-800 p-4">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-3">Curva de mejora (puntuación media por sesión)</p>
          <CurvaLinea sesiones={sesiones} />
        </Card>
      )}

      {/* Tabla historial */}
      {sesiones.length === 0 ? (
        <div className="text-center py-8 text-slate-600 text-[11px]">Aún no tienes sesiones registradas</div>
      ) : (
        <Card className="bg-slate-900 border-slate-800 !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-800">
                <tr>
                  {['#', 'Fecha', 'Llamadas', 'Ventas', 'Conv.', 'Nota', 'Resultado', 'Comentarios'].map(h => (
                    <th key={h} className="px-3 py-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sesiones.map((s, i) => <FilaSesion key={s.sesion_id} s={s} idx={i} />)}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default HistorialProgreso;
