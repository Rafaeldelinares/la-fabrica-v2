import React, { useState, useEffect } from 'react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import { TrendingUp } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';

const ESTADO_CLASSES = {
  activo:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pausado:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelado: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const VentasPanel = () => {
  const [filtroEstado, setFiltroEstado]       = useState('');
  const [filtroOperador, setFiltroOperador]   = useState('');
  const [ventas, setVentas]                   = useState(null);
  const [total, setTotal]                     = useState(0);
  const [operadores, setOperadores]           = useState([]);

  const N8N = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch(`${N8N}/crm-operadores-lista`)
      .then(r => r.json())
      .then(d => { if (d.ok) setOperadores(d.operadores); })
      .catch(() => setOperadores([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtroEstado)    params.set('estado', filtroEstado);
    if (filtroOperador)  params.set('operador_id', filtroOperador);
    fetch(`${N8N}/crm-ventas?${params}`)
      .then(r => r.json())
      .then(d => { if (d.ok) { setVentas(d.ventas); setTotal(d.total); } })
      .catch(() => setVentas([]));
  }, [filtroEstado, filtroOperador]);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">RELACIÓN DE VENTAS</h2>
          <Badge className="bg-slate-800 text-slate-300 border-slate-700">
            {ventas !== null ? total : '—'} CLIENTES
          </Badge>
        </div>

        <div className="flex gap-3">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase"
          >
            <option value="">Estado: Todos</option>
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select
            value={filtroOperador}
            onChange={e => setFiltroOperador(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase"
          >
            <option value="">Operador: Todos</option>
            {operadores.map(op => <option key={op.id} value={op.id}>{op.nombre}</option>)}
          </select>
        </div>
      </div>

      <Card className="flex flex-col flex-1 bg-slate-900 border-slate-800 !p-0 overflow-hidden">
        {ventas === null ? (
          <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
            <div className="flex flex-col gap-3 items-center">
              <div className="h-4 w-48 bg-slate-800 rounded-sm" />
              <div className="h-3 w-32 bg-slate-800 rounded-sm" />
            </div>
          </div>
        ) : ventas.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <EmptyState title="Sin ventas registradas" icon={TrendingUp} description="Las ventas cerradas por los operadores aparecerán aquí" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-mono">ID</th>
                  <th className="px-4 py-3">CLIENTE</th>
                  <th className="px-4 py-3 font-mono">TELÉFONO</th>
                  <th className="px-4 py-3">LOCALIDAD</th>
                  <th className="px-4 py-3">CATEGORÍA</th>
                  <th className="px-4 py-3">OPERADOR</th>
                  <th className="px-4 py-3 font-mono">SCORING</th>
                  <th className="px-4 py-3">ESTADO</th>
                  <th className="px-4 py-3 font-mono">FECHA VENTA</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-4 font-mono text-slate-500">{String(v.id).padStart(4, '0')}</td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-200 uppercase tracking-wide">{v.nombre_comercial}</p>
                      {v.email && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{v.email}</p>}
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-300">{v.telefono || '—'}</td>
                    <td className="px-4 py-4 uppercase text-slate-400">{v.localidad || '—'}</td>
                    <td className="px-4 py-4 uppercase text-slate-500">{v.categoria || '—'}</td>
                    <td className="px-4 py-4 font-bold text-slate-300">{v.operador_nombre || '—'}</td>
                    <td className="px-4 py-4 font-mono">
                      {v.scoring ? (
                        <><span className="text-white font-bold">{v.scoring}</span><span className="text-slate-600">/100</span></>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={ESTADO_CLASSES[v.estado] || 'bg-slate-700 text-slate-400 border-slate-600'}>
                        {v.estado || 'activo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-500">{fmtFecha(v.fecha_venta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
};

export default VentasPanel;
