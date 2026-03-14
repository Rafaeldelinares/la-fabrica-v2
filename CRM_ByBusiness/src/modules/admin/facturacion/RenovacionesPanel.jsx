import React, { useState, useEffect } from 'react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import { RefreshCw } from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const urgencyClass = (dias) => {
  if (dias <= 15)  return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (dias <= 30)  return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-slate-700/50 text-slate-400 border-slate-600';
};

const urgencyLabel = (dias) => {
  if (dias <= 0)   return 'VENCIDA';
  if (dias <= 15)  return `${dias}d URGENTE`;
  if (dias <= 30)  return `${dias}d PRÓXIMA`;
  return `${dias}d`;
};

const RenovacionesPanel = () => {
  const [renovaciones, setRenovaciones] = useState(null);
  const N8N_URL = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

  const load = () => {
    setRenovaciones(null);
    fetch(`${N8N_URL}/crm-renovaciones`)
      .then(r => r.json())
      .then(d => { if (d.ok) setRenovaciones(d.renovaciones); })
      .catch(() => setRenovaciones([]));
  };

  useEffect(load, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Contratos con vencimiento en los próximos 90 días</span>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase">
          <RefreshCw size={11} /> Actualizar
        </button>
      </div>

      <Card className="flex flex-col bg-slate-900 border-slate-800 !p-0 overflow-hidden">
        {renovaciones === null ? (
          <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
            <div className="flex flex-col gap-3 items-center">
              <div className="h-4 w-48 bg-slate-800 rounded-sm" />
              <div className="h-3 w-32 bg-slate-800 rounded-sm" />
            </div>
          </div>
        ) : renovaciones.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <EmptyState title="Sin renovaciones próximas" icon={RefreshCw} description="No hay contratos que venzan en los próximos 90 días" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">CLIENTE</th>
                  <th className="px-4 py-3">PRODUCTO</th>
                  <th className="px-4 py-3 font-mono">DURACIÓN</th>
                  <th className="px-4 py-3 font-mono">INICIO</th>
                  <th className="px-4 py-3 font-mono">VENCE</th>
                  <th className="px-4 py-3">GESTOR</th>
                  <th className="px-4 py-3 font-mono">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {renovaciones.map(r => (
                  <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-200 uppercase tracking-wide">{r.nombre_comercial}</p>
                      <p className="text-[10px] text-slate-600 font-mono mt-0.5">{r.telefono}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.producto_nombre}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{r.duracion_meses}m</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{fmtDate(r.fecha_inicio)}</td>
                    <td className="px-4 py-3 font-mono text-slate-300 font-bold">{fmtDate(r.fecha_fin)}</td>
                    <td className="px-4 py-3 text-slate-400">{r.gestor_nombre || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={urgencyClass(r.dias_restantes)}>
                        {urgencyLabel(r.dias_restantes)}
                      </Badge>
                    </td>
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

export default RenovacionesPanel;
