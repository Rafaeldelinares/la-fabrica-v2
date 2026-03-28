import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './agenda-calendar.css';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalIcon, Phone, Users, MessageSquare, Star, Wrench, CalendarClock, ExternalLink, HardDrive, Search, Mail, CheckCircle2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { useAuth } from '../../../modules/auth/AuthContext';
import DatePickerField from '../../../shared/ui/DatePickerField';
import { fmtFechaHora } from '../../../utils/dates';
import ClienteDrawer from '../cartera/ClienteDrawer';
import SlotPicker from './SlotPicker';

/** Tipos de evento operador — se distribuyen 10:00–20:00 si llegan a las 00:00. */
const TIPOS_OPERADOR = new Set(['interaccion', 'llamada_operador', 'callback_operador']);
/** Tipos de evento admin — se distribuyen 10:00–14:00 si llegan a las 00:00. */
const TIPOS_ADMIN    = new Set(['cita_cliente', 'proxima_accion_cliente']);

/** Granularidad de slots en minutos. */
const SLOT_MIN = 15;

/**
 * Convierte "HH:MM:SS" o "HH:MM" a minutos desde medianoche.
 * @param {string} horaTexto
 * @returns {number}
 */
const horaAMinutos = (horaTexto) => {
  const partes = horaTexto.split(':');
  return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
};

/**
 * Si un evento llega con hora 00:00 (sin hora real en DB), redistribuye
 * su start/end a una franja horaria razonable de forma determinista.
 * El offset se calcula a partir del ID para que sea estable entre recargas.
 *
 * Si el evento tiene gestor_id y horarios contiene su agenda para ese día,
 * se distribuye dentro de sus bloques de trabajo reales.
 * Fallback: TIPOS_OPERADOR → 10:00–20:00, TIPOS_ADMIN → 10:00–14:00.
 *
 * @param {{ id: string, tipo: string, start: Date, end: Date, gestor_id?: number }} evento
 * @param {Map<number, Array<{dia_semana: number, hora_inicio: string, hora_fin: string}>>} horarios
 *   Mapa de usuario_id → bloques del usuario.
 * @returns {{ start: Date, end: Date }}
 */
const redistribuirHora = (evento, horarios) => {
  const start = new Date(evento.start);
  if (start.getHours() >= 9) return { start, end: new Date(evento.end) };

  const esOperador = TIPOS_OPERADOR.has(evento.tipo);
  const esAdmin    = TIPOS_ADMIN.has(evento.tipo);
  if (!esOperador && !esAdmin) return { start, end: new Date(evento.end) };

  const idNumerico = parseInt(String(evento.id).replace(/\D/g, '') || '0', 10);
  const gestorId   = evento.gestor_id ? parseInt(evento.gestor_id, 10) : null;

  // Índice de día de semana (0 = lunes, 6 = domingo) a partir del start
  // JS getDay(): 0=dom,1=lun,...,6=sab → convertir: (getDay() + 6) % 7
  const diaSemana = (start.getDay() + 6) % 7;

  // Intentar usar horario real del gestor
  if (gestorId && horarios) {
    const bloquesGestor = (horarios.get(gestorId) || [])
      .filter(bloque => bloque.dia_semana === diaSemana);

    if (bloquesGestor.length > 0) {
      // Calcular capacidad total de slots en los bloques del día
      const totalSlotsDisponibles = bloquesGestor.reduce((acumulado, bloque) => {
        const inicioMin = horaAMinutos(bloque.hora_inicio);
        const finMin    = horaAMinutos(bloque.hora_fin);
        return acumulado + Math.floor((finMin - inicioMin) / SLOT_MIN);
      }, 0);

      if (totalSlotsDisponibles > 0) {
        const slotElegido = idNumerico % totalSlotsDisponibles;
        let slotContador = 0;

        for (const bloque of bloquesGestor) {
          const inicioMin = horaAMinutos(bloque.hora_inicio);
          const finMin    = horaAMinutos(bloque.hora_fin);
          const slotsEnBloque = Math.floor((finMin - inicioMin) / SLOT_MIN);

          if (slotElegido < slotContador + slotsEnBloque) {
            const slotEnBloque = slotElegido - slotContador;
            const minutosFinal = inicioMin + slotEnBloque * SLOT_MIN;
            const nuevaStart   = new Date(start);
            nuevaStart.setHours(Math.floor(minutosFinal / 60), minutosFinal % 60, 0, 0);
            const nuevaEnd = new Date(nuevaStart.getTime() + SLOT_MIN * 60 * 1000);
            return { start: nuevaStart, end: nuevaEnd };
          }
          slotContador += slotsEnBloque;
        }
      }
    }
  }

  // Fallback: lógica original por tipo
  const rangoMin  = esOperador ? 600 : 240;
  const offsetMin = idNumerico % rangoMin;
  const horaBase  = 10 * 60 + offsetMin;

  const nuevaStart = new Date(start);
  nuevaStart.setHours(Math.floor(horaBase / 60), horaBase % 60, 0, 0);
  const nuevaEnd = new Date(nuevaStart.getTime() + 60 * 60 * 1000);
  return { start: nuevaStart, end: nuevaEnd };
};

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
  backup_sistema:         { textClass: 'text-cyan-400',    borderClass: 'border-cyan-400/40',    bgClass: 'bg-cyan-400/10',    label: 'Backup sistema',    Icon: HardDrive     },
  envio_proforma_waha:   { textClass: 'text-green-400',   borderClass: 'border-green-400/40',   bgClass: 'bg-green-400/10',   label: 'Envío proforma WA',    Icon: MessageSquare  },
  envio_proforma_email:  { textClass: 'text-purple-400',  borderClass: 'border-purple-400/40',  bgClass: 'bg-purple-400/10',  label: 'Envío proforma Email', Icon: Mail           },
  aceptacion_proforma:   { textClass: 'text-emerald-500', borderClass: 'border-emerald-500/40', bgClass: 'bg-emerald-500/10', label: 'Aceptación proforma',  Icon: CheckCircle2   },
};

/** Devuelve el título de la cabecera del calendario según la vista activa (día/semana/mes). */
const fmtHeader = (date, view) => {
  if (view === Views.DAY)  return format(date, "EEEE d 'de' MMMM yyyy", { locale: es });
  if (view === Views.WEEK) return `Semana del ${format(startOfWeek(date, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`;
  return format(date, 'MMMM yyyy', { locale: es });
};

/**
 * Modal para crear una nueva cita cliente desde el panel de agenda.
 * Incluye selector de duración y buscador de huecos disponibles (SlotPicker).
 * @param {{ clientes: Array, gestorId: number, onClose: Function, onCreated: Function }} props
 */
const NuevaCitaModal = ({ clientes, gestorId, onClose, onCreated }) => {
  const [form, setForm]             = useState({ cliente_id: '', fecha_hora: '', motivo: '' });
  const [duracionMin, setDuracionMin] = useState(30);
  const [mostrarSlotPicker, setMostrarSlotPicker] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [errorGuardar, setErrorGuardar] = useState(false);

  const actualizarCampo = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const fechaDesdeHoy = format(new Date(), 'yyyy-MM-dd');

  const alSeleccionarSlot = (isoString) => {
    actualizarCampo('fecha_hora', format(new Date(isoString), "yyyy-MM-dd'T'HH:mm"));
    setMostrarSlotPicker(false);
  };

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
      else { setErrorGuardar(true); }
    } catch {
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
          {/* Cliente */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Cliente</label>
            <select value={form.cliente_id} onChange={e => actualizarCampo('cliente_id', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500">
              <option value="">Seleccionar cliente...</option>
              {clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.nombre_comercial}</option>)}
            </select>
          </div>

          {/* Duración */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Duración</label>
            <div className="flex gap-2">
              {[15, 30, 45].map(minutos => (
                <button
                  key={minutos}
                  onClick={() => setDuracionMin(minutos)}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-sm border transition-colors uppercase tracking-widest ${
                    duracionMin === minutos
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                      : 'text-slate-500 border-slate-700 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {minutos} min
                </button>
              ))}
            </div>
          </div>

          {/* Fecha y hora + buscador de huecos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest">Fecha y hora</label>
              <button
                onClick={() => setMostrarSlotPicker(prev => !prev)}
                disabled={!form.cliente_id}
                className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 disabled:text-slate-700 disabled:cursor-not-allowed transition-colors"
                title={form.cliente_id ? 'Buscar hueco disponible' : 'Selecciona un cliente primero'}
              >
                <Search size={10} /> Buscar hueco
              </button>
            </div>
            {mostrarSlotPicker && gestorId ? (
              <SlotPicker
                usuarioId={gestorId}
                duracionMin={duracionMin}
                fechaDesde={fechaDesdeHoy}
                onSlotSelected={alSeleccionarSlot}
                onCancelar={() => setMostrarSlotPicker(false)}
              />
            ) : (
              <DatePickerField
                selected={form.fecha_hora ? new Date(form.fecha_hora) : null}
                onChange={(date) => actualizarCampo('fecha_hora', date ? format(date, "yyyy-MM-dd'T'HH:mm") : '')}
                showTimeSelect
                placeholderText="DD/MM/AAAA HH:MM"
              />
            )}
          </div>

          {/* Motivo */}
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
  /** Lista de clientes para el selector. */
  clientes:  PropTypes.arrayOf(PropTypes.object).isRequired,
  /** ID del gestor autenticado — se pasa como usuarioId al SlotPicker. */
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
  const tipoConfig = TIPO[evento.tipo] || TIPO.llamada_operador;
  const tieneCliente = Boolean(evento.cliente_id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-sm p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-black uppercase tracking-widest ${tipoConfig.textClass}`}>{tipoConfig.label}</span>
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
  const tipoConfig = TIPO[evento.tipo] || TIPO.llamada_operador;
  const { Icon } = tipoConfig;
  const desc = evento.descripcion
    ? (evento.descripcion.length > 80 ? `${evento.descripcion.slice(0, 77)}…` : evento.descripcion)
    : null;

  return (
    <div className={`bg-slate-900 border ${tipoConfig.borderClass} rounded-sm shadow-2xl p-3 w-64`}>
      <div className={`flex items-center gap-1.5 mb-2 ${tipoConfig.textClass}`}>
        <Icon size={10} />
        <span className="text-[9px] font-black uppercase tracking-widest">{tipoConfig.label}</span>
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
  const tipoConfig = TIPO[event.tipo] || TIPO.llamada_operador;
  const { Icon } = tipoConfig;
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
  const [filtros, setFiltros]     = useState({ cita_cliente: true, callback_operador: true, interaccion: true, llamada_operador: true, proxima_accion_cliente: true, backup_sistema: true, gbp_snapshot: true, gbp_autorepair: true, envio_proforma_waha: true, envio_proforma_email: true, aceptacion_proforma: true });
  const [modalCita, setModalCita]         = useState(false);
  const [eventoSel, setEventoSel]         = useState(null);
  const [clienteDrawer, setClienteDrawer] = useState(null);
  const [tooltipEvento, setTooltipEvento] = useState(null);
  const [errorCarga, setErrorCarga]       = useState(false);
  const [errorClientes, setErrorClientes] = useState(false);
  const [renovaciones, setRenovaciones]   = useState([]);
  const tooltipWrapperRef                 = useRef(null);
  /**
   * Caché de horarios de trabajo: Map<usuario_id, Array<{dia_semana, hora_inicio, hora_fin}>>.
   * Se puebla al montar el panel y no requiere re-render.
   */
  const horariosRef = useRef(new Map());

  const abrirClienteDesdeAgenda = useCallback((clienteId) => {
    fetch(`${N8N}/crm-cartera-get?cliente_id=${clienteId}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.clientes?.length) setClienteDrawer(data.clientes[0]);
        else setErrorCarga(true);
      })
      .catch(() => { setClienteDrawer(null); setErrorCarga(true); });
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
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setEventos(data.eventos.map(evento => {
            const { start, end } = redistribuirHora(
              { ...evento, start: new Date(evento.start), end: new Date(evento.end) },
              horariosRef.current
            );
            return {
              ...evento,
              start,
              end,
              title:   evento.titulo,
              tooltip: evento.descripcion ? `${evento.titulo} — ${evento.descripcion}` : evento.titulo,
            };
          }));
        } else {
          setEventos([]);
          setErrorCarga(true);
        }
      })
      .catch(() => { setEventos([]); setErrorCarga(true); })
      .finally(() => setLoading(false));
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch(`${N8N}/crm-clientes`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setClientes(data.clientes);
        else { setClientes([]); setErrorClientes(true); }
      })
      .catch(() => { setClientes([]); setErrorClientes(true); });
  }, []);

  // Carga horarios de trabajo de todos los usuarios al montar el panel.
  // Se almacena en un ref para no forzar re-renders innecesarios.
  useEffect(() => {
    fetch(`${N8N}/crm-horarios-todos`)
      .then(res => res.json())
      .then(datos => {
        if (!datos.ok) return;
        const mapaHorarios = new Map();
        datos.horarios.forEach(bloque => {
          const usuarioId = bloque.usuario_id;
          if (!mapaHorarios.has(usuarioId)) mapaHorarios.set(usuarioId, []);
          mapaHorarios.get(usuarioId).push({
            dia_semana:  bloque.dia_semana,
            hora_inicio: bloque.hora_inicio,
            hora_fin:    bloque.hora_fin,
          });
        });
        horariosRef.current = mapaHorarios;
      })
      .catch(() => { horariosRef.current = new Map(); setErrorCarga(true); });
  }, []);

  useEffect(() => {
    fetch(`${N8N}/crm-cartera-get`)
      .then(r => r.json())
      .then(d => {
        const clientes = d.ok ? (d.clientes || []) : [];
        const now  = new Date();
        const in60 = new Date(Date.now() + 60 * 86400000);
        setRenovaciones(
          clientes
            .filter(c => c.proxima_renovacion
              && new Date(c.proxima_renovacion) >= now
              && new Date(c.proxima_renovacion) <= in60)
            .sort((a, b) => new Date(a.proxima_renovacion) - new Date(b.proxima_renovacion))
        );
      })
      .catch(() => { setRenovaciones([]); setErrorCarga(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventosFiltrados = eventos.filter(evento => filtros[evento.tipo]);

  const estiloEvento = useCallback((evento) => ({
    className: `ev-tipo-${evento.tipo ?? 'default'}`,
  }), []);

  const navegar = (dir) => {
    if (view === Views.MONTH) setFecha(fechaActual => dir > 0 ? addMonths(fechaActual, 1) : subMonths(fechaActual, 1));
    else setFecha(fechaActual => {
      const nuevaFecha = new Date(fechaActual);
      nuevaFecha.setDate(nuevaFecha.getDate() + dir * (view === Views.DAY ? 1 : 7));
      return nuevaFecha;
    });
  };

  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── Toolbar fila 1: navegación + vistas ── */}
      <div className="flex items-center justify-between gap-2">
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

        {/* Vistas + acción */}
        <div className="flex items-center gap-1.5">
          {[['DÍA', Views.DAY], ['SEMANA', Views.WEEK], ['MES', Views.MONTH]].map(([etiqueta, vista]) => (
            <button key={vista} onClick={() => setView(vista)}
              className={`text-[9px] font-black px-2.5 py-1.5 rounded-sm border transition-colors uppercase tracking-widest ${
                view === vista
                  ? 'bg-[#D00000]/10 text-white border-[#D00000]/40'
                  : 'text-slate-500 border-slate-700 hover:text-white hover:border-slate-500'
              }`}>{etiqueta}</button>
          ))}
          <button onClick={() => setModalCita(true)}
            className="flex items-center gap-1 text-[9px] font-black text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1.5 rounded-sm transition-colors uppercase tracking-widest ml-1">
            <Plus size={10} /> Cita
          </button>
        </div>
      </div>

      {/* ── Toolbar fila 2: filtros por tipo (wrap a 2 líneas si hace falta) ── */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {Object.entries(TIPO).map(([tipo, tipoConfig]) => (
          <button key={tipo} onClick={() => setFiltros(prev => ({ ...prev, [tipo]: !prev[tipo] }))}
            className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-sm border transition-all ${
              filtros[tipo]
                ? `${tipoConfig.textClass} ${tipoConfig.borderClass} ${tipoConfig.bgClass}`
                : 'border-slate-800 text-slate-700'
            }`}>
            <tipoConfig.Icon size={9} />
            {tipoConfig.label}
            <span className="font-mono ml-0.5 opacity-60">
              {eventosFiltrados.filter(eventoFiltrado => eventoFiltrado.tipo === tipo).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Calendario + Renovaciones ── */}
      <div className="flex flex-1 min-h-0 gap-3">
        <div className="flex-1 min-w-0">
        <TooltipCtx.Provider value={tooltipHandlers}>
        {errorCarga && (
          <div className="mb-2 px-3 py-2 bg-red-900/20 border border-red-900/40 rounded-sm text-[10px] text-red-400 font-mono uppercase tracking-widest">
            Error al cargar la agenda — comprueba la conexión con n8n
          </div>
        )}
        {errorClientes && (
          <div className="mb-2 px-3 py-2 bg-red-900/20 border border-red-900/40 rounded-sm text-[10px] text-red-400 font-mono uppercase tracking-widest">
            Error al cargar clientes — el selector de nueva cita puede estar vacío
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

        {/* Sidebar — Renovaciones próximas (60 días) */}
        <div className="w-52 shrink-0 flex flex-col border-l border-slate-800 pl-3 overflow-y-auto custom-scrollbar">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono font-black mb-3 shrink-0">
            Renovaciones · <span className="text-[#D00000]">{renovaciones.length}</span>
          </p>
          {renovaciones.length === 0 ? (
            <p className="text-[10px] text-slate-700 font-mono">Sin renovaciones en 60 días</p>
          ) : renovaciones.map(c => {
            const d    = new Date(c.proxima_renovacion);
            const days = Math.ceil((d - new Date()) / 86400000);
            return (
              <button
                key={c.id}
                onClick={() => abrirClienteDesdeAgenda(c.id)}
                className="flex items-start gap-2 py-2 border-b border-slate-900 hover:bg-slate-900/40 transition-colors text-left w-full"
              >
                <CalendarClock size={10} className={`mt-0.5 shrink-0 ${days <= 14 ? 'text-amber-400' : 'text-slate-600'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-slate-300 truncate leading-tight">{c.nombre_comercial}</p>
                  <p className={`text-[9px] font-mono ${days <= 14 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {format(d, 'dd/MM/yy')} · {days}d
                  </p>
                </div>
              </button>
            );
          })}
        </div>
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
