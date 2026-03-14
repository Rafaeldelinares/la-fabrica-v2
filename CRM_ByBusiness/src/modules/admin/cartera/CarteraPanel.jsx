import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import ClienteDrawer from './ClienteDrawer';
import { useAuth } from '../../auth/AuthContext';

const SEMAFORO_CONFIG = {
  verde: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Sanos' },
  ambar: { dot: 'bg-amber-400',   badge: 'bg-amber-400/10  text-amber-400  border-amber-400/20',   label: 'Atención' },
  rojo:  { dot: 'bg-red-500',     badge: 'bg-red-500/10    text-red-400    border-red-500/20',     label: 'Críticos' },
};

const fmtDias = (dias) => {
  if (dias === null || dias === undefined) return '—';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `${dias}d`;
};

const fmtFecha = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
};

const CarteraPanel = () => {
  const { user } = useAuth();
  const [clientes, setClientes]       = useState(null);
  const [filtroSemaforo, setFiltroS]  = useState('');
  const [busqueda, setBusqueda]       = useState('');
  const [seleccionado, setSeleccionado] = useState(null);

  const N8N = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

  useEffect(() => {
    fetch(`${N8N}/crm-cartera-gestor`)
      .then(r => r.json())
      .then(d => { if (d.ok) setClientes(d.clientes); })
      .catch(() => setClientes([]));
  }, []);

  const stats = useMemo(() => {
    if (!clientes) return { total: 0, verde: 0, ambar: 0, rojo: 0 };
    return {
      total: clientes.length,
      verde: clientes.filter(c => c.semaforo === 'verde').length,
      ambar: clientes.filter(c => c.semaforo === 'ambar').length,
      rojo:  clientes.filter(c => c.semaforo === 'rojo').length,
    };
  }, [clientes]);

  const filtrados = useMemo(() => {
    if (!clientes) return [];
    return clientes.filter(c => {
      if (filtroSemaforo && c.semaforo !== filtroSemaforo) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (c.nombre_comercial || '').toLowerCase().includes(q)
          || (c.localidad || '').toLowerCase().includes(q)
          || (c.email || '').toLowerCase().includes(q)
          || (c.telefono || '').includes(q);
      }
      return true;
    });
  }, [clientes, filtroSemaforo, busqueda]);

  return (
    <div className="flex gap-0 h-full overflow-hidden">

      {/* PANEL IZQUIERDO — tabla */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${seleccionado ? 'w-[58%]' : 'w-full'} overflow-hidden pr-4`}>

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">CARTERA DE CLIENTES</h2>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-sm px-3 py-1.5">
            <Search size={13} className="text-slate-500" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar cliente…"
              className="bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600 font-mono w-36"
            />
          </div>
        </div>

        {/* Stats semáforo */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {[
            { key: '', label: 'Total clientes', value: stats.total, dot: 'bg-slate-500' },
            { key: 'verde', ...SEMAFORO_CONFIG.verde, value: stats.verde },
            { key: 'ambar', ...SEMAFORO_CONFIG.ambar, value: stats.ambar },
            { key: 'rojo',  ...SEMAFORO_CONFIG.rojo,  value: stats.rojo  },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFiltroS(filtroSemaforo === s.key ? '' : s.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm border transition-all text-left ${
                filtroSemaforo === s.key
                  ? 'bg-slate-800 border-slate-600'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-black text-white font-mono leading-tight">{clientes === null ? '—' : s.value}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Tabla */}
        <Card className="flex flex-col flex-1 bg-slate-900 border-slate-800 !p-0 overflow-hidden">
          {clientes === null ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="flex flex-col gap-3 items-center animate-pulse">
                <div className="h-4 w-48 bg-slate-800 rounded-sm" />
                <div className="h-3 w-32 bg-slate-800 rounded-sm" />
              </div>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <EmptyState title="Sin clientes" icon={Users} description="No hay clientes activos que coincidan con el filtro" />
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-left text-xs text-slate-400">
                <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-6"></th>
                    <th className="px-4 py-3">CLIENTE</th>
                    <th className="px-4 py-3 font-mono">ÚLTIMO CONTACTO</th>
                    <th className="px-4 py-3 font-mono">RENOVACIÓN</th>
                    <th className="px-4 py-3 font-mono">MRR</th>
                    <th className="px-4 py-3">GESTOR</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => setSeleccionado(seleccionado?.id === c.id ? null : c)}
                      className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                        seleccionado?.id === c.id
                          ? 'bg-slate-800/60'
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className={`w-2.5 h-2.5 rounded-full ${SEMAFORO_CONFIG[c.semaforo]?.dot || 'bg-slate-600'}`} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-200 uppercase tracking-wide">{c.nombre_comercial}</p>
                        {c.localidad && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{c.localidad}</p>}
                      </td>
                      <td className="px-4 py-4 font-mono">
                        <span className={`${
                          c.semaforo === 'rojo'  ? 'text-red-400' :
                          c.semaforo === 'ambar' ? 'text-amber-400' :
                          'text-slate-400'
                        }`}>
                          {fmtDias(c.dias_sin_contacto)}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-500">
                        {c.proxima_renovacion ? (
                          <span className={
                            new Date(c.proxima_renovacion) < new Date(Date.now() + 60 * 86400000)
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }>
                            {fmtFecha(c.proxima_renovacion)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-slate-300">
                        {c.mrr > 0 ? `${Number(c.mrr).toFixed(0)}€` : '—'}
                      </td>
                      <td className="px-4 py-4 text-slate-400">{c.gestor_nombre || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* PANEL DERECHO — drawer */}
      {seleccionado && (
        <div className="w-[42%] shrink-0 overflow-hidden rounded-xl border border-slate-800">
          <ClienteDrawer
            cliente={seleccionado}
            gestorId={user?.id}
            onClose={() => setSeleccionado(null)}
          />
        </div>
      )}
    </div>
  );
};

export default CarteraPanel;
