import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, MapPin, Star, AlertCircle } from 'lucide-react';
import EmptyState from '../../../shared/ui/EmptyState';

const ESTADO_COLOR = {
  activa:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pausada: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  baja:    'bg-slate-700/30 text-slate-500 border-slate-700/30',
};

const RatingStars = ({ value }) => {
  if (!value) return <span className="text-slate-600 font-mono text-[10px]">—</span>;
  return (
    <span className="font-mono text-amber-400 text-[11px] font-bold">
      {Number(value).toFixed(1)} ★
    </span>
  );
};

const GbpFichasPanel = ({ onSelectFicha }) => {
  const [fichas, setFichas] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const base = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

  const cargar = () => {
    setFichas(null);
    const params = filtroEstado ? `?estado=${filtroEstado}` : '';
    fetch(`${base}/crm-gbp-fichas${params}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setFichas(d.fichas); })
      .catch(() => setFichas([]));
  };

  useEffect(() => { cargar(); }, [filtroEstado]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {[['', 'Todas'], ['activa', 'Activas'], ['pausada', 'Pausadas'], ['baja', 'Baja']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltroEstado(val)}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
                filtroEstado === val ? 'bg-[#D00000]/10 text-[#D00000] border-[#D00000]/30' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargar} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
            <RefreshCw size={11} /> Actualizar
          </button>
          <button onClick={() => onSelectFicha('alta')} className="flex items-center gap-1.5 text-[10px] font-black text-white bg-[#D00000] hover:bg-red-700 px-3 py-2 rounded-sm transition-colors uppercase tracking-widest">
            <Plus size={11} /> Alta Ficha
          </button>
        </div>
      </div>

      {/* Tabla */}
      {fichas === null ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-sm animate-pulse" />)}
        </div>
      ) : fichas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <EmptyState title="Sin fichas GBP" icon={MapPin} description="Añade la primera ficha de un cliente con '+ Alta Ficha'" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                {['Nombre Ficha', 'Categoría', 'Rating', 'Δ Rating', 'Reseñas Pend.', 'Estado', 'Última sync', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fichas.map(f => {
                const delta = f.rating_actual && f.rating_inicial
                  ? (Number(f.rating_actual) - Number(f.rating_inicial)).toFixed(2)
                  : null;
                return (
                  <tr key={f.id} onClick={() => onSelectFicha(f)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors group">
                    <td className="px-3 py-3">
                      <p className="text-[11px] font-bold text-white">{f.nombre}</p>
                      <p className="text-[10px] text-slate-600 font-mono">{f.google_location_id?.split('/').pop()}</p>
                    </td>
                    <td className="px-3 py-3 text-[10px] text-slate-400">{f.categoria_principal || '—'}</td>
                    <td className="px-3 py-3"><RatingStars value={f.rating_actual} /></td>
                    <td className="px-3 py-3">
                      {delta !== null ? (
                        <span className={`text-[10px] font-mono font-bold ${Number(delta) > 0 ? 'text-emerald-400' : Number(delta) < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {Number(delta) > 0 ? '+' : ''}{delta}
                        </span>
                      ) : <span className="text-slate-600 text-[10px]">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {Number(f.resenas_pendientes) > 0
                        ? <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400"><AlertCircle size={10} />{f.resenas_pendientes}</span>
                        : <span className="text-[10px] text-slate-600">0</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border ${ESTADO_COLOR[f.estado]}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[10px] font-mono text-slate-600">
                      {f.ultimo_sync ? new Date(f.ultimo_sync).toLocaleDateString('es-ES') : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={e => { e.stopPropagation(); onSelectFicha(f); }}
                        className="text-[9px] font-mono text-slate-600 hover:text-white px-2 py-1 border border-slate-800 hover:border-slate-600 rounded-sm transition-colors opacity-0 group-hover:opacity-100">
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GbpFichasPanel;
