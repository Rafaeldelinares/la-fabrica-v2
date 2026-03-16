import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './agenda-calendar.css';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalIcon, Phone, Users, MessageSquare, Star, Wrench, CalendarClock, ExternalLink } from 'lucide-react';
import PropTypes from 'prop-types';
import { useAuth } from '../../../modules/auth/AuthContext';
import DatePickerField from '../../../shared/ui/DatePickerField';
import { fmtFechaHora } from '../../../utils/dates';
import ClienteDrawer from '../cartera/ClienteDrawer';

const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales: { es },
});

// Endpoint n8n — VITE_N8N_URL debe estar definida en producción
const N8N = import.meta.env.VITE_N8N_URL;

const TIPO = {
  cita_cliente:           { textClass: 'text-blue-500',    borderClass: 'border-blue-500/40',    bgClass: 'bg-blue-500/10',    label: 'Cita cliente',      Icon: CalIcon       },
  callback_operador:      { textClass: 'text-amber-400',   borderClass: 'border-amber-400/40',   bgClass: 'bg-amber-400/10',   label: 'Callback operador', Icon: Phone         },
  interaccion:            { textClass: 'text-emerald-500', borderClass: 'border-emerald-500/40', bgClass: 'bg-emerald-500/10', label: 'Interacción',       Icon: MessageSquare },
  llamada_operador:       { textClass: 'text-violet-500',  borderClass: 'border-violet-500/40',  bgClass: 'bg-violet-500/10',  label: 'Llamada operador',  Icon: Users         },
  gbp_snapshot:           { textClass: 'text-green-500',   borderClass: 'border-green-500/40',   bgClass: 'bg-green-500/10',   label: 'GBP Snapshot',      Icon: Star          },
  gbp_autorepair:         { textClass: 'text-red-500',     borderClass: 'border-red-500/40',     bgClass: 'bg-red-500/10',     label: 'Motor reparado',    Icon: Wrench        },
  proxima_accion_cliente: { textClass: 'text-[#D00000]',   borderClass: 'border-[#D00000]/40',   bgClass: 'bg-[#D00000]/10',   label: 'Próxima acción',    Icon: CalendarClock },
};

/** Devuelve el título de la cabecera del calendario según la vista activa (día/semana/mes). */
const fmtHeader = (date, view) => {
  if (view === Views.DAY)  return format(date, "EEEE d 'de' MMMM yyyy", { locale: es });
  if (view === Views.WEEK) return `Semana del ${format(startOfWeek(date, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`;
  return format(date, 'MMMM yyyy', { locale: es });
};

/** Modal para crear una nueva cita cliente desde el panel de agenda. */
const NuevaCitaModal = ({ clientes, gestorId, onClose, onCreated }) => {
  const [form, setForm]           = useState({ cliente_id: '', fecha_hora: '', motivo: '' });
  const [saving, setSaving]       = useState(false);
  const [errorGuardar, setErrorGuardar] = useState(false);
  const actualizarCampo = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const guardar = async () => {
    if (!form.cliente_id || !form.fecha_hora || !form.motivo) return;
    setSaving(true);
    setErrorGuardar(false);
    try {
      const response = await fetch(`${N8N}/crm-crear-cita`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, gestor_id: gestorId }),
      });
      const data = await response.json();
      if (data.ok) { onCreated(); onClose(); }
    } catch (err) {
      console.error('[NuevaCitaModal] error de red al crear cita:', err);
      setErrorGuardar(true);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Nueva Cita</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        {errorGuardar && (
          <p className="text-[10px] text-red-400 font-mono mb-3 bg-red-900/20 border border-red-900/30 rounded-sm px-3 py-2">
            Error al crear la cita — inténtalo de nuevo
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Cliente</label>
            <select value={form.cliente_id} onChange={e => actualizarCampo('cliente_id', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500">
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_comercial}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Fecha y hora</label>
            <DatePickerField
              selected={form.fecha_hora ? new Date(form.fecha_hora) : null}
              onChange={(date) => actualizarCampo('fecha_hora', date ? format(date, "yyyy-MM-dd'T'HH:mm") : '')}
              showTimeSelect
              placeholderText="DD/MM/AAAA HH:MM"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Motivo</label>
            <input value={form.motivo} onChange={e => actualizarCampo('motivo', e.target.value)}
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

NuevaCitaModal.propTypes = {
  clientes:  PropTypes.arrayOf(PropTypes.object).isRequired,
  gestorId:  PropTypes.number,
  onClose:   PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
};

/**
 * Modal de detalle de un evento del calendario.
 * Si el evento tiene cliente_id, el título (nombre empresa) es clickeable y abre la ficha.
 * @param {{ evento: Object, onClose: Function, onAbrirCliente: Function }} props
 */
const EventoDetalle = ({ evento, onClose, onAbrirCliente }) => {
  if (!evento) return null;
  const cfg = TIPO[evento.tipo] || TIPO.llamada_operador;
  const tieneCliente = Boolean(evento.cliente_id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-sm p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.textClass}`}>{cfg.label}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={14} /></button>
        </div>

        {tieneCliente ? (
          <button
            onClick={() => { onAbrirCliente(evento.cliente_id); onClose(); }}
            className="group flex items-center gap-1.5 mb-1 text-left w-full"
          >
            <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">
              {evento.titulo}
            </span>
            <ExternalLink size={10} className="text-slate-600 group-hover:text-blue-400 transition-colors shrink-0 mt-px" />
          </button>
        ) : (
          <p className="text-sm font-bold text-white mb-1">{evento.titulo}</p>
        )}

        <p className="text-xs text-slate-400 mb-3">{evento.descripcion}</p>
        <div className="text-[10px] text-slate-500 font-mono space-y-1">
          <div>{format(evento.start, "dd/MM/yyyy · HH:mm")}</div>
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

EventoDetalle.propTypes = {
  evento:         PropTypes.object,
  onClose:        PropTypes.func.isRequired,
  onAbrirCliente: PropTypes.func.isRequired,
};

/** Contexto para pasar callbacks hover a EventoTag sin prop-drilling ni globales mutables. */
const TooltipCtx = React.createContext({ set: null, clear: null });

/**
 * Contenido del tooltip flotante de evento — sin lógica de posicionamiento.
 * El posicionamiento se realiza en el padre via ref.current.style.setProperty.
 * @param {{ evento: Object }} props
 */
const TooltipContenido = ({ evento }) => {
  const cfg = TIPO[evento.tipo] || TIPO.llamada_operador;
  const { Icon } = cfg;
  const desc = evento.descripcion
    ? (evento.descripcion.length > 80 ? `${evento.descripcion.slice(0, 77)}…` : evento.descripcion)
    : null;

  return (
    <div className={`bg-slate-900 border ${cfg.borderClass} rounded-sm shadow-2xl p-3 w-64`}>
      <div className={`flex items-center gap-1.5 mb-2 ${cfg.textClass}`}>
        <Icon size={10} />
        <span className="text-[9px] font-black uppercase tracking-widest">{cfg.label}</span>
      </div>
      <p className="text-xs font-bold text-white mb-2 leading-tight">{evento.titulo}</p>
      <p className="text-[10px] font-mono text-slate-400 mb-1.5">{fmtFechaHora(evento.start)}</p>
      {(evento.responsable || evento.operador_nombre) && (
        <p className="text-[10px] text-slate-500 font-mono mb-1.5">
          {evento.responsable ? `Gestor: ${evento.responsable}` : `Operador: ${evento.operador_nombre}`}
        </p>
      )}
      {desc && (
        <p className="text-[10px] text-slate-400 italic border-l-2 border-slate-700 pl-2 mb-2 leading-relaxed">{desc}</p>
      )}
      {evento.estado && (
        <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase border ${
          evento.estado === 'realizada' || evento.estado === 'confirmada'
            ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40'
            : 'bg-slate-800 text-slate-400 border-slate-700'
        }`}>{evento.estado}</span>
      )}
    </div>
  );
};

TooltipContenido.propTypes = { evento: PropTypes.object.isRequired };

/**
 * Componente de evento personalizado para react-big-calendar.
 * Muestra icono de tipo + título y dispara el tooltip flotante en hover.
 * @param {{ event: Object }} props
 */
const EventoTag = ({ event }) => {
  const { set, clear } = React.useContext(TooltipCtx);
  const cfg = TIPO[event.tipo] || TIPO.llamada_operador;
  const { Icon } = cfg;
  return (
    <div
      className="flex items-center gap-1 overflow-hidden w-full h-full px-0.5"
      onMouseEnter={e => set?.(event, e.clientX, e.clientY)}
      onMouseLeave={() => clear?.()}
    >
      <Icon size={9} className="shrink-0 opacity-70" />
      <span className="text-[10px] font-bold truncate leading-none">{event.title}</span>
    </div>
  );
};

EventoTag.propTypes = { event: PropTypes.object.isRequired };

const CALENDAR_COMPONENTS = { event: EventoTag };

/** Panel de agenda unificada (admin): visualiza todos los eventos del equipo con filtros por tipo. */
const AgendaGlobalPanel = () => {
  const { user } = useAuth();
  const [eventos, setEventos]     = useState([]);
  const [clientes, setClientes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState(Views.WEEK);
  const [fecha, setFecha]         = useState(new Date());
  const [filtros, setFiltros]     = useState({ cita_cliente: true, callback_operador: true, interaccion: true, llamada_operador: true, proxima_accion_cliente: true });
  const [modalCita, setModalCita]         = useState(false);
  const [eventoSel, setEventoSel]         = useState(null);
  const [clienteDrawer, setClienteDrawer] = useState(null);
  const [tooltipEvento, setTooltipEvento] = useState(null);
  const [errorCarga, setErrorCarga]       = useState(false);
  const tooltipWrapperRef                 = useRef(null);

  const abrirClienteDesdeAgenda = useCallback((clienteId) => {
    fetch(`${N8N}/crm-cartera-get?cliente_id=${clienteId}`)
      .then(r => r.json())
      .then(d => { if (d.ok && d.clientes?.length) setClienteDrawer(d.clientes[0]); })
      .catch(err => { console.error('[AgendaGlobal] error cargando ficha cliente:', err); });
  }, []);

  const tooltipHandlers = useMemo(() => ({
    set: (evento, x, y) => {
      tooltipWrapperRef.current?.style.setProperty('--tt-x', `${Math.min(x + 14, window.innerWidth - 272)}px`);
      tooltipWrapperRef.current?.style.setProperty('--tt-y', `${Math.min(y + 10, window.innerHeight - 210)}px`);
      setTooltipEvento(evento);
    },
    clear: () => setTooltipEvento(null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const cargar = useCallback(() => {
    setLoading(true);
    setErrorCarga(false);
    const fechaInicio = format(startOfMonth(subMonths(fecha, 1)), "yyyy-MM-dd'T'00:00:00");
    const fechaFin    = format(endOfMonth(addMonths(fecha, 1)),   "yyyy-MM-dd'T'23:59:59");
    fetch(`${N8N}/crm-agenda-unificada?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setEventos(d.eventos.map(e => ({
          ...e,
          start:   new Date(e.start),
          end:     new Date(e.end),
          title:   e.titulo,
          tooltip: e.descripcion ? `${e.titulo} — ${e.descripcion}` : e.titulo,
        })));
      })
      .catch(err => { console.error('[AgendaGlobal] error cargando eventos:', err); setEventos([]); setErrorCarga(true); })
      .finally(() => setLoading(false));
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch(`${N8N}/crm-clientes`)
      .then(r => r.json())
      .then(d => { if (d.ok) setClientes(d.clientes); })
      .catch(err => { console.error('[AgendaGlobal] error cargando clientes:', err); setClientes([]); });
  }, []);

  const eventosFiltrados = eventos.filter(e => filtros[e.tipo]);

  const estiloEvento = useCallback((ev) => ({
    className: `ev-tipo-${ev.tipo ?? 'default'}`,
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
              className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-sm border transition-all ${
                filtros[tipo]
                  ? `${cfg.textClass} ${cfg.borderClass} ${cfg.bgClass}`
                  : 'border-slate-800 text-slate-700'
              }`}>
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
        <TooltipCtx.Provider value={tooltipHandlers}>
        {errorCarga && (
          <div className="mb-2 px-3 py-2 bg-red-900/20 border border-red-900/40 rounded-sm text-[10px] text-red-400 font-mono uppercase tracking-widest">
            Error al cargar la agenda — comprueba la conexión con n8n
          </div>
        )}
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
            components={CALENDAR_COMPONENTS}
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
            className="agenda-calendar-height"
            popup
          />
        )}
        </TooltipCtx.Provider>
      </div>

      {modalCita && (
        <NuevaCitaModal
          clientes={clientes}
          gestorId={user?.id}
          onClose={() => setModalCita(false)}
          onCreated={cargar}
        />
      )}

      {eventoSel && (
        <EventoDetalle
          evento={eventoSel}
          onClose={() => setEventoSel(null)}
          onAbrirCliente={abrirClienteDesdeAgenda}
        />
      )}
      {clienteDrawer && (
        <div className="fixed top-16 bottom-10 inset-x-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setClienteDrawer(null)}>
          <div className="w-[90vw] max-w-[1080px] h-full overflow-hidden rounded-sm border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <ClienteDrawer cliente={clienteDrawer} gestorId={user?.id} onClose={() => setClienteDrawer(null)} onGestorChanged={() => {}} />
          </div>
        </div>
      )}
      <div ref={tooltipWrapperRef} className={`fixed z-[9999] pointer-events-none tt-flotante${tooltipEvento ? '' : ' hidden'}`}>
        {tooltipEvento && <TooltipContenido evento={tooltipEvento} />}
      </div>
    </div>
  );
};

export default AgendaGlobalPanel;
