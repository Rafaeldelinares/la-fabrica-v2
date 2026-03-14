import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './agenda-calendar.css';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalIcon, Phone, Users, MessageSquare } from 'lucide-react';
import { useAuth } from '../../../modules/auth/AuthContext';

const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales: { es },
});

const N8N = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

const TIPO = {
  cita_cliente:      { color: '#3b82f6', label: 'Cita cliente',      Icon: CalIcon       },
  callback_operador: { color: '#f59e0b', label: 'Callback operador', Icon: Phone         },
  interaccion:       { color: '#10b981', label: 'Interacción',       Icon: MessageSquare },
  llamada_operador:  { color: '#8b5cf6', label: 'Llamada operador',  Icon: Users         },
};

const fmtHeader = (date, view) => {
  if (view === Views.DAY)  return format(date, "EEEE d 'de' MMMM yyyy", { locale: es });
  if (view === Views.WEEK) return `Semana del ${format(startOfWeek(date, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`;
  return format(date, 'MMMM yyyy', { locale: es });
};

/* ── Modal nueva cita ───────────────────────────────────── */
const NuevaCitaModal = ({ clientes, gestorId, onClose, onCreated }) => {
  const [form, setForm] = useState({ cliente_id: '', fecha_hora: '', motivo: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.cliente_id || !form.fecha_hora || !form.motivo) return;
    setSaving(true);
    try {
      const r = await fetch(`${N8N}/crm-crear-cita`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, gestor_id: gestorId }),
      });
      const d = await r.json();
      if (d.ok) { onCreated(); onClose(); }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Nueva Cita</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Cliente</label>
            <select value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500">
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_comercial}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Fecha y hora</label>
            <input type="datetime-local" value={form.fecha_hora} onChange={e => set('fecha_hora', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Motivo</label>
            <input value={form.motivo} onChange={e => set('motivo', e.target.value)}
              placeholder="Revisión trimestral, seguimiento contrato..."
              className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-xs text-slate-400 border border-slate-700 rounded-sm hover:border-slate-500 transition-colors">Cancelar</button>
          <button onClick={guardar} disabled={saving || !form.cliente_id || !form.fecha_hora || !form.motivo}
            className="flex-1 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-500 rounded-sm transition-colors disabled:opacity-40 uppercase tracking-widest">
            {saving ? '...' : 'Crear cita'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Detalle evento ─────────────────────────────────────── */
const EventoDetalle = ({ evento, onClose }) => {
  if (!evento) return null;
  const cfg = TIPO[evento.tipo] || TIPO.llamada_operador;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={14} /></button>
        </div>
        <p className="text-sm font-bold text-white mb-1">{evento.titulo}</p>
        <p className="text-xs text-slate-400 mb-3">{evento.descripcion}</p>
        <div className="text-[10px] text-slate-500 font-mono space-y-1">
          <div>{format(evento.start, "d MMM yyyy · HH:mm", { locale: es })}</div>
          {evento.responsable     && <div>Gestor: {evento.responsable}</div>}
          {evento.operador_nombre && <div>Operador: {evento.operador_nombre}</div>}
          {evento.google_cid      && <div className="text-slate-700">GID: {evento.google_cid}</div>}
          <div className="mt-2">
            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase border ${
              evento.estado === 'realizada' || evento.estado === 'confirmada'
                ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>{evento.estado}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Panel principal ────────────────────────────────────── */
const AgendaGlobalPanel = () => {
  const { user } = useAuth();
  const [eventos, setEventos]     = useState([]);
  const [clientes, setClientes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState(Views.WEEK);
  const [fecha, setFecha]         = useState(new Date());
  const [filtros, setFiltros]     = useState({ cita_cliente: true, callback_operador: true, interaccion: true, llamada_operador: true });
  const [modalCita, setModalCita] = useState(false);
  const [eventoSel, setEventoSel] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    const ini = format(startOfMonth(subMonths(fecha, 1)), "yyyy-MM-dd'T'00:00:00");
    const fin = format(endOfMonth(addMonths(fecha, 1)),   "yyyy-MM-dd'T'23:59:59");
    fetch(`${N8N}/crm-agenda-unificada?fecha_inicio=${ini}&fecha_fin=${fin}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setEventos(d.eventos.map(e => ({
          ...e,
          start: new Date(e.start),
          end:   new Date(e.end),
          title: e.titulo,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch(`${N8N}/crm-clientes`)
      .then(r => r.json())
      .then(d => { if (d.ok) setClientes(d.clientes); })
      .catch(() => {});
  }, []);

  const eventosFiltrados = eventos.filter(e => filtros[e.tipo]);

  const estiloEvento = useCallback((ev) => ({
    style: {
      backgroundColor: (TIPO[ev.tipo]?.color || '#64748b') + '25',
      borderLeft:       `3px solid ${TIPO[ev.tipo]?.color || '#64748b'}`,
      color:             TIPO[ev.tipo]?.color || '#cbd5e1',
      borderRadius:     '3px',
    }
  }), []);

  const navegar = (dir) => {
    if (view === Views.MONTH) setFecha(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    else setFecha(d => {
      const n = new Date(d);
      n.setDate(n.getDate() + dir * (view === Views.DAY ? 1 : 7));
      return n;
    });
  };

  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Navegación */}
        <div className="flex items-center gap-2">
          <button onClick={() => navegar(-1)} className="p-1.5 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-sm transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-black text-white uppercase tracking-widest min-w-[220px] text-center">
            {fmtHeader(fecha, view)}
          </span>
          <button onClick={() => navegar(1)} className="p-1.5 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-sm transition-colors">
            <ChevronRight size={14} />
          </button>
          <button onClick={() => setFecha(new Date())}
            className="text-[9px] font-black text-slate-500 hover:text-white border border-slate-700 px-2 py-1 rounded-sm transition-colors uppercase tracking-widest ml-1">
            HOY
          </button>
        </div>

        {/* Filtros por tipo */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(TIPO).map(([tipo, cfg]) => (
            <button key={tipo} onClick={() => setFiltros(p => ({ ...p, [tipo]: !p[tipo] }))}
              className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-sm border transition-all"
              style={filtros[tipo]
                ? { borderColor: cfg.color + '60', backgroundColor: cfg.color + '15', color: cfg.color }
                : { borderColor: '#1e293b', color: '#334155' }}>
              <cfg.Icon size={9} />
              {cfg.label}
              <span className="font-mono ml-0.5 opacity-60">
                {eventosFiltrados.filter(e => e.tipo === tipo).length}
              </span>
            </button>
          ))}
        </div>

        {/* Vistas + acción */}
        <div className="flex items-center gap-1.5">
          {[['DÍA', Views.DAY], ['SEMANA', Views.WEEK], ['MES', Views.MONTH]].map(([lbl, v]) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[9px] font-black px-2.5 py-1.5 rounded-sm border transition-colors uppercase tracking-widest ${
                view === v
                  ? 'bg-[#D00000]/10 text-white border-[#D00000]/40'
                  : 'text-slate-500 border-slate-700 hover:text-white hover:border-slate-500'
              }`}>{lbl}</button>
          ))}
          <button onClick={() => setModalCita(true)}
            className="flex items-center gap-1 text-[9px] font-black text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1.5 rounded-sm transition-colors uppercase tracking-widest ml-1">
            <Plus size={10} /> Cita
          </button>
        </div>
      </div>

      {/* ── Calendario ── */}
      <div className="flex-1 min-h-0">
        {loading && eventosFiltrados.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[10px] text-slate-700 font-mono uppercase tracking-widest animate-pulse">Cargando agenda...</p>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={eventosFiltrados}
            view={view}
            date={fecha}
            onView={setView}
            onNavigate={setFecha}
            onSelectEvent={setEventoSel}
            eventPropGetter={estiloEvento}
            culture="es"
            messages={{
              week: 'Semana', day: 'Día', month: 'Mes', today: 'Hoy',
              previous: '‹', next: '›', agenda: 'Agenda',
              noEventsInRange: 'Sin eventos en este período.',
              showMore: n => `+${n} más`,
            }}
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({ start, end }) =>
                `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`,
              dayHeaderFormat: d => format(d, 'EEE d', { locale: es }).toUpperCase(),
              dayRangeHeaderFormat: ({ start, end }) =>
                `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`,
            }}
            style={{ height: '100%' }}
            popup
          />
        )}
      </div>

      {modalCita && (
        <NuevaCitaModal
          clientes={clientes}
          gestorId={user?.id}
          onClose={() => setModalCita(false)}
          onCreated={cargar}
        />
      )}

      {eventoSel && <EventoDetalle evento={eventoSel} onClose={() => setEventoSel(null)} />}
    </div>
  );
};

export default AgendaGlobalPanel;
