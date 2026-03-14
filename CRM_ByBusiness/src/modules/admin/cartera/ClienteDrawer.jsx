import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, MessageSquare, Calendar, FileText, Plus, Clock, User } from 'lucide-react';
import RegistrarInteraccionModal from './RegistrarInteraccionModal';

const SEMAFORO = {
  verde: 'bg-emerald-500',
  ambar: 'bg-amber-400',
  rojo:  'bg-red-500',
};

const TIPO_EVENTO = {
  interaccion: { llamada: '📞', email: '✉️', reunion: '🤝', nota: '📝', acuerdo: '✅' },
  llamada:     { default: '📱' },
};

const TIPO_COLOR = {
  interaccion: 'border-slate-700 bg-slate-900/50',
  llamada:     'border-slate-800 bg-slate-950/50',
};

const fmtFecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const fmtDias = (dias) => {
  if (dias === null || dias === undefined) return 'Sin contacto';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `Hace ${dias} días`;
};

const ClienteDrawer = ({ cliente, gestorId, onClose }) => {
  const [timeline, setTimeline]     = useState(null);
  const [showModal, setShowModal]   = useState(false);

  const N8N = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

  const fetchTimeline = () => {
    fetch(`${N8N}/crm-interacciones-cliente?cliente_id=${cliente.id}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setTimeline(d.timeline); })
      .catch(() => setTimeline([]));
  };

  useEffect(() => { fetchTimeline(); }, [cliente.id]);

  const handleSaved = () => {
    setShowModal(false);
    fetchTimeline();
  };

  const iconEvento = (ev) => {
    if (ev.tipo_evento === 'llamada') return '📱';
    return TIPO_EVENTO.interaccion[ev.tipo] || '📋';
  };

  return (
    <>
      <div className="flex flex-col h-full border-l border-slate-800 bg-slate-950">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${SEMAFORO[cliente.semaforo] || 'bg-slate-600'}`} />
            <div>
              <p className="text-sm font-black text-white uppercase tracking-wide leading-tight">{cliente.nombre_comercial}</p>
              {cliente.localidad && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{cliente.localidad}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors shrink-0 ml-2">
            <X size={16} />
          </button>
        </div>

        {/* Datos de contacto */}
        <div className="px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex flex-col gap-2">
            {cliente.telefono && (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Phone size={12} className="text-slate-600 shrink-0" />
                {cliente.telefono}
              </div>
            )}
            {cliente.email && (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Mail size={12} className="text-slate-600 shrink-0" />
                {cliente.email}
              </div>
            )}
            {cliente.gestor_nombre && (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <User size={12} className="text-slate-600 shrink-0" />
                Gestor: {cliente.gestor_nombre}
              </div>
            )}
          </div>
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-3 border-b border-slate-800 shrink-0">
          {[
            { label: 'Último contacto', value: fmtDias(cliente.dias_sin_contacto) },
            { label: 'Contratos',       value: cliente.num_contratos || '0' },
            { label: 'MRR',             value: cliente.mrr > 0 ? `${Number(cliente.mrr).toFixed(0)}€` : '—' },
          ].map((k, i) => (
            <div key={i} className={`px-4 py-3 text-center ${i < 2 ? 'border-r border-slate-800' : ''}`}>
              <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">{k.label}</p>
              <p className="text-sm font-bold text-slate-300 mt-0.5 font-mono">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Botón registrar */}
        <div className="px-5 py-3 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-[#D00000]/10 hover:bg-[#D00000]/20 border border-[#D00000]/30 hover:border-[#D00000]/60 text-[#D00000] text-xs font-mono uppercase tracking-widest rounded-sm transition-colors"
          >
            <Plus size={13} />
            Registrar interacción
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-4">Historial completo</p>

          {timeline === null ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 bg-slate-800/40 rounded-sm animate-pulse" />
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-600 text-xs font-mono">Sin interacciones registradas</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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
                      {fmtFecha(ev.fecha_evento)}
                    </div>
                  </div>

                  {ev.resumen && (
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">{ev.resumen}</p>
                  )}
                  {ev.acuerdo_alcanzado && (
                    <p className="text-[11px] text-emerald-400/80 font-mono mt-1.5">✅ {ev.acuerdo_alcanzado}</p>
                  )}
                  {ev.proxima_accion && (
                    <p className="text-[11px] text-amber-400/80 font-mono mt-1">→ {ev.proxima_accion}</p>
                  )}
                  {ev.autor && (
                    <p className="text-[10px] text-slate-600 font-mono mt-1.5">{ev.autor}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <RegistrarInteraccionModal
          cliente={cliente}
          gestorId={gestorId}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

export default ClienteDrawer;
