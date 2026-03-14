import React, { useState, useEffect } from 'react';
import { useAuth } from '../../modules/auth/AuthContext';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import EmptyState from '../../shared/ui/EmptyState';
import { Calendar, Copy, Phone, RefreshCw } from 'lucide-react';

const agruparPorDia = (programadas) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
  const semana = new Date(hoy); semana.setDate(semana.getDate() + 7);

  const grupos = { HOY: [], MAÑANA: [], 'ESTA SEMANA': [], 'MÁS ADELANTE': [] };
  programadas.forEach(p => {
    const fecha = new Date(p.fecha_programada);
    fecha.setHours(0, 0, 0, 0);
    if (fecha.getTime() === hoy.getTime()) grupos.HOY.push(p);
    else if (fecha.getTime() === manana.getTime()) grupos.MAÑANA.push(p);
    else if (fecha < semana) grupos['ESTA SEMANA'].push(p);
    else grupos['MÁS ADELANTE'].push(p);
  });
  return grupos;
};

const fmtFecha = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const TarjetaProgramada = ({ p }) => {
  const [copied, setCopied] = useState(false);
  const copiar = () => {
    navigator.clipboard.writeText(p.telefono || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="p-4 border-slate-800 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">{p.nombre_comercial}</h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">{p.localidad || '—'}</p>
        </div>
        <Badge status="pendiente">{p.tipo?.toUpperCase() || 'CALLBACK'}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <Phone size={12} className="text-slate-500 shrink-0" />
        <span className="text-sm font-mono text-white tracking-wider">{p.telefono || 'Sin teléfono'}</span>
        <button
          onClick={copiar}
          className="ml-auto text-slate-600 hover:text-white transition-colors p-1 bg-slate-800 rounded-sm"
        >
          <Copy size={12} />
        </button>
        {copied && <span className="text-[10px] text-emerald-400 font-mono">copiado</span>}
      </div>

      <div className="flex items-center gap-2 text-[11px] font-mono text-[#D00000]">
        <Calendar size={11} />
        <span>{fmtFecha(p.fecha_programada)}</span>
      </div>

      {p.nombre_responsable && (
        <p className="text-[10px] text-slate-500 font-mono">Responsable: {p.nombre_responsable}</p>
      )}

      {p.notas && (
        <p className="text-xs text-slate-400 border-l-2 border-slate-700 pl-3 italic">{p.notas}</p>
      )}
    </Card>
  );
};

const AgendaPersonal = () => {
  const { user } = useAuth();
  const [programadas, setProgramadas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`${import.meta.env.VITE_N8N_URL}/crm-llamadas-programadas?operador_id=${user.id}`)
      .then(res => res.json())
      .then(data => { if (data?.ok) setProgramadas(data.programadas || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [user?.id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded-sm" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-sm" />)}
      </div>
    );
  }

  const grupos = agruparPorDia(programadas);
  const tieneAlgo = programadas.length > 0;

  return (
    <div className="flex flex-col gap-6 h-full">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Agenda Personal</h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            {programadas.length} llamada{programadas.length !== 1 ? 's' : ''} programada{programadas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm"
        >
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {!tieneAlgo ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState title="Sin llamadas programadas" icon={Calendar} description="Tus callbacks aparecerán aquí ordenados por fecha" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1">
          {Object.entries(grupos).map(([grupo, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={grupo}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{grupo}</span>
                  <span className="text-[10px] font-mono text-slate-700 bg-slate-800 px-2 py-0.5 rounded-sm">{items.length}</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {items.map(p => <TarjetaProgramada key={p.id} p={p} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default AgendaPersonal;
