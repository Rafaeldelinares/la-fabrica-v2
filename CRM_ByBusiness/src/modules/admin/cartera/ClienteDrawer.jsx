import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { X, Phone, Mail, Calendar, FileText, Plus, Clock, User, Globe, MapPin, Star, MessageSquare, RefreshCw, TrendingUp, AlertCircle, CheckCircle, XCircle, AlertTriangle, CalendarClock, Building2, ExternalLink, BadgeCheck } from 'lucide-react';
import RegistrarInteraccionModal from './RegistrarInteraccionModal';
import DatePickerField from '../../../shared/ui/DatePickerField';
import { fmtFecha, fmtFechaHora, fmtMesAno } from '../../../utils/dates';

const SEMAFORO = {
  verde: 'bg-emerald-500',
  ambar: 'bg-amber-400',
  rojo:  'bg-red-500',
};

const TIPO_EVENTO = {
  interaccion: { llamada: '📞', email: '✉️', reunion: '🤝', nota: '📝', acuerdo: '✅' },
};

const TIPO_COLOR = {
  interaccion: 'border-slate-700 bg-slate-900/50',
  llamada:     'border-slate-800 bg-slate-950/50',
};


/** Formatea un número de días de antigüedad como texto legible (p.ej. "3 días", "Hoy"). */
const fmtDias = (dias) => {
  if (dias === null || dias === undefined) return 'Sin contacto';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `Hace ${dias} días`;
};

const TABS = [
  { id: 'ficha',      label: 'Ficha' },
  { id: 'contratos',  label: 'Contratos' },
  { id: 'historial',  label: 'Historial' },
  { id: 'gbp',        label: 'Google Business' },
];

/** TabFicha — Pestaña de datos de contacto, localización y próxima acción del cliente. */
const TabFicha = ({ cliente, n8nUrl }) => {
  const [proximaFecha, setProximaFecha] = useState(cliente.proxima_accion_fecha?.slice(0, 10) || '');
  const [proximaNota,  setProximaNota]  = useState(cliente.proxima_accion_nota  || '');
  const [guardando, setGuardando]       = useState(false);
  const [guardado,  setGuardado]        = useState(false);
  const [gestores,      setGestores]    = useState([]);
  const [gestorId,      setGestorId]    = useState(cliente.gestor_id || '');
  const [guardandoGest, setGuardandoGest] = useState(false);
  const [guardadoGest,  setGuardadoGest]  = useState(false);

  const timerGuardado     = useRef(null);
  const timerGuardadoGest = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(timerGuardado.current);
      clearTimeout(timerGuardadoGest.current);
    };
  }, []);

  useEffect(() => {
    fetch(`${n8nUrl}/crm-usuarios-get`)
      .then(r => r.json())
      .then(d => { if (d.ok) setGestores(d.usuarios.filter(u => ['admin','operador'].includes(u.rol))); })
      .catch(() => setGestores([]));
  // n8nUrl es constante de build, no reactiva
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveGestor = async () => {
    setGuardandoGest(true);
    try {
      await fetch(`${n8nUrl}/crm-cliente-gestor-asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, gestor_id: gestorId || null }),
      });
      setGuardadoGest(true);
      clearTimeout(timerGuardadoGest.current);
      timerGuardadoGest.current = setTimeout(() => setGuardadoGest(false), 2000);
    } catch { /* error de red — finally restablece el estado */ } finally { setGuardandoGest(false); }
  };

  const handleSaveProxima = async () => {
    setGuardando(true);
    try {
      await fetch(`${n8nUrl}/crm-cliente-proxima-accion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, fecha: proximaFecha || null, nota: proximaNota || null }),
      });
      setGuardado(true);
      clearTimeout(timerGuardado.current);
      timerGuardado.current = setTimeout(() => setGuardado(false), 2000);
    } catch { /* error de red — finally restablece el estado */ } finally { setGuardando(false); }
  };

  const localidadComercialDiferente =
    cliente.localidad_negocio && cliente.localidad_negocio !== cliente.localidad;

  return (
    <div className="flex flex-col gap-0">
      {/* Datos de contacto */}
      <div className="px-5 py-4 border-b border-slate-800">
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
          <div className="flex items-center gap-2">
            <User size={12} className="text-slate-600 shrink-0" />
            <select
              value={gestorId}
              onChange={e => { setGestorId(e.target.value); setGuardadoGest(false); }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-sm px-2 py-1 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 transition-colors"
            >
              <option value="">— Sin gestor —</option>
              {gestores.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
            <button
              onClick={handleSaveGestor}
              disabled={guardandoGest || String(gestorId) === String(cliente.gestor_id || '')}
              className={`text-[9px] font-mono px-2 py-1 rounded-sm border transition-colors shrink-0 ${
                guardadoGest
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 disabled:opacity-30'
              }`}
            >
              {guardadoGest ? '✓' : guardandoGest ? '…' : 'OK'}
            </button>
          </div>
          {cliente.actividad && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <FileText size={12} className="text-slate-600 shrink-0" />
              {cliente.actividad}
            </div>
          )}
          {cliente.cif && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <FileText size={12} className="text-slate-600 shrink-0" />
              CIF: {cliente.cif}
            </div>
          )}
          {cliente.web && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Globe size={12} className="text-slate-600 shrink-0" />
              <a href={cliente.web.startsWith('http') ? cliente.web : `https://${cliente.web}`}
                target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate">
                {cliente.web}
              </a>
            </div>
          )}
          {cliente.bybusiness_url && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <BadgeCheck size={12} className="text-[#D00000] shrink-0" />
              <a href={cliente.bybusiness_url} target="_blank" rel="noopener noreferrer"
                className="text-[#D00000]/80 hover:text-[#D00000] truncate flex items-center gap-1">
                ByBusiness <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Localización: fiscal vs comercial */}
      <div className="px-5 py-3 border-b border-slate-800">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-2">Localización</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <FileText size={11} className="text-slate-700 shrink-0" />
            <span className="text-slate-600">Fiscal:</span>
            <span>{[cliente.localidad, cliente.provincia].filter(Boolean).join(', ') || '—'}</span>
          </div>
          {localidadComercialDiferente && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Building2 size={11} className="text-slate-500 shrink-0" />
              <span className="text-slate-500">Negocio:</span>
              <span className="text-slate-300">
                {[cliente.localidad_negocio, cliente.provincia_negocio].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Última interacción / notas */}
      {cliente.notas_internas && (
        <div className="px-5 py-3 border-b border-slate-800">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-1.5">Última interacción</p>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{cliente.notas_internas}</p>
        </div>
      )}

      {/* SEO */}
      {cliente.seo_ref && (
        <div className="px-5 py-3 border-b border-slate-800">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-1.5">SEO / Keywords</p>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">{cliente.seo_ref}</p>
        </div>
      )}

      {/* Próxima acción */}
      <div className="px-5 py-4">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
          <CalendarClock size={10} />
          Próxima acción
        </p>
        <div className="flex flex-col gap-2">
          <DatePickerField
            selected={proximaFecha ? new Date(proximaFecha) : null}
            onChange={(date) => setProximaFecha(date ? format(date, 'yyyy-MM-dd') : '')}
            placeholderText="DD/MM/AAAA"
          />
          <textarea
            value={proximaNota}
            onChange={e => setProximaNota(e.target.value)}
            placeholder="Nota sobre la próxima acción…"
            rows={2}
            className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 resize-none placeholder:text-slate-600 w-full"
          />
          <button
            onClick={handleSaveProxima}
            disabled={guardando}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-slate-700 rounded-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50 w-full"
          >
            {guardado ? <><CheckCircle size={10} className="text-emerald-400" /> Guardado</> : guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** TabContratos — Pestaña de contratos activos del cliente con opción de añadir nuevos servicios. */
const TabContratos = ({ cliente, n8nUrl }) => {
  const [contratos, setContratos] = useState(null);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ tipo_servicio: '', importe_mensual: '', fecha_inicio: '', meses: '12' });
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  useEffect(() => {
    fetch(`${n8nUrl}/crm-contratos-cliente?cliente_id=${cliente.id}`)
      .then(r => r.json())
      .then(d => setContratos(d.ok ? d.contratos : []))
      .catch(() => setContratos([]));
  }, [cliente.id]);

  const handleNuevoContrato = async () => {
    if (!nuevoForm.tipo_servicio || !nuevoForm.fecha_inicio) return;
    setGuardandoNuevo(true);
    const fechaInicio = new Date(nuevoForm.fecha_inicio);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMonth(fechaFin.getMonth() + parseInt(nuevoForm.meses || 12));
    try {
      const r = await fetch(`${n8nUrl}/crm-contrato-crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          tipo_servicio: nuevoForm.tipo_servicio,
          importe_mensual: parseFloat(nuevoForm.importe_mensual) || null,
          fecha_inicio: nuevoForm.fecha_inicio,
          fecha_fin: fechaFin.toISOString().slice(0, 10),
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setNuevoOpen(false);
        setNuevoForm({ tipo_servicio: '', importe_mensual: '', fecha_inicio: '', meses: '12' });
        fetch(`${n8nUrl}/crm-contratos-cliente?cliente_id=${cliente.id}`)
          .then(r => r.json())
          .then(d => setContratos(d.ok ? d.contratos : []));
      }
    } catch { /* error de red — finally restablece el estado */ } finally { setGuardandoNuevo(false); }
  };

  if (contratos === null) return (
    <div className="flex flex-col gap-2 px-5 py-4">
      {[1,2].map(i => <div key={i} className="h-20 bg-slate-800/40 rounded-sm animate-pulse" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {contratos.length === 0 && !nuevoOpen && (
        <div className="border border-dashed border-slate-800 rounded-sm p-6 text-center">
          <p className="text-slate-600 text-xs font-mono">Sin contratos registrados</p>
        </div>
      )}

      {contratos.map((c, i) => {
        const mrr = Number(c.importe_mensual || c.mrr || 0);
        const fechaFin = c.fecha_fin || c.fecha_renovacion;
        const diasFin = fechaFin ? Math.ceil((new Date(fechaFin) - new Date()) / 86400000) : null;
        const colorFin = diasFin !== null && diasFin <= 0
          ? 'text-red-400'
          : diasFin !== null && diasFin <= 60
          ? 'text-amber-400'
          : 'text-slate-400';
        return (
          <div key={c.id || i} className="border border-slate-700 rounded-sm bg-slate-900/50">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-slate-500 shrink-0" />
                <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  {c.tipo_servicio || c.servicio || c.tipo || '—'}
                </p>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${
                c.estado === 'activo'    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                c.estado === 'cancelado' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                c.estado === 'pausado'   ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' :
                'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {c.estado || 'activo'}
              </span>
            </div>
            {/* Métricas */}
            <div className="grid grid-cols-3 px-4 py-3 gap-x-4">
              <div>
                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-0.5">Cuota/mes</p>
                <p className="text-base font-black text-slate-200 font-mono leading-tight">
                  {mrr > 0 ? `${mrr.toFixed(0)}€` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-0.5">Inicio</p>
                <p className="text-xs text-slate-400 font-mono">{fmtFecha(c.fecha_inicio)}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-0.5">Vencimiento</p>
                <p className={`text-xs font-mono ${colorFin}`}>
                  {fmtFecha(fechaFin)}
                  {diasFin !== null && diasFin <= 60 && diasFin > 0 && (
                    <span className="block text-[9px] text-amber-500/80">en {diasFin}d</span>
                  )}
                  {diasFin !== null && diasFin <= 0 && (
                    <span className="block text-[9px] text-red-400">Vencido</span>
                  )}
                </p>
              </div>
            </div>
            {c.notas && (
              <div className="px-4 pb-3">
                <p className="text-[10px] text-slate-600 font-mono leading-relaxed">{c.notas}</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Formulario nuevo servicio */}
      {nuevoOpen && (
        <div className="border border-slate-700 rounded-sm p-4 bg-slate-900/50 flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Nuevo servicio</p>
          <select
            value={nuevoForm.tipo_servicio}
            onChange={e => setNuevoForm(f => ({ ...f, tipo_servicio: e.target.value }))}
            className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full"
          >
            <option value="">Seleccionar servicio…</option>
            {['Premium Pro', 'SEO Local', 'Pack Starter', 'Pack Profesional', 'Pack Premium', 'Redes Sociales', 'Google Ads', 'Web'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-slate-600 font-mono mb-1">€/mes</p>
              <input type="number" placeholder="0.00" value={nuevoForm.importe_mensual}
                onChange={e => setNuevoForm(f => ({ ...f, importe_mensual: e.target.value }))}
                className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full" />
            </div>
            <div>
              <p className="text-[9px] text-slate-600 font-mono mb-1">Fecha inicio</p>
              <DatePickerField
                selected={nuevoForm.fecha_inicio ? new Date(nuevoForm.fecha_inicio) : null}
                onChange={(date) => setNuevoForm(f => ({ ...f, fecha_inicio: date ? format(date, 'yyyy-MM-dd') : '' }))}
                placeholderText="DD/MM/AAAA"
              />
            </div>
            <div>
              <p className="text-[9px] text-slate-600 font-mono mb-1">Duración (meses)</p>
              <input type="number" placeholder="12" value={nuevoForm.meses}
                onChange={e => setNuevoForm(f => ({ ...f, meses: e.target.value }))}
                className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full" />
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={handleNuevoContrato}
              disabled={guardandoNuevo || !nuevoForm.tipo_servicio || !nuevoForm.fecha_inicio}
              className="flex-1 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-slate-600 rounded-sm text-slate-300 hover:text-white transition-colors disabled:opacity-40">
              {guardandoNuevo ? 'Guardando…' : 'Guardar contrato'}
            </button>
            <button onClick={() => setNuevoOpen(false)}
              className="px-3 py-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Botón añadir */}
      {!nuevoOpen && (
        <button onClick={() => setNuevoOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-slate-700 rounded-sm text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors">
          <Plus size={11} />
          Añadir nuevo servicio
        </button>
      )}
    </div>
  );
};

/** TabHistorial — Pestaña de historial cronológico de interacciones del cliente. */
const TabHistorial = ({ timeline, onAddInteraccion }) => {
  const iconEvento = (ev) => {
    if (ev.tipo_evento === 'llamada') return '📱';
    return TIPO_EVENTO.interaccion[ev.tipo] || '📋';
  };

  if (timeline === null) return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-800/40 rounded-sm animate-pulse" />)}
    </div>
  );

  if (timeline.length === 0) return (
    <div className="text-center py-10">
      <p className="text-slate-600 text-xs font-mono">Sin interacciones registradas</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
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
              {fmtFechaHora(ev.fecha_evento)}
            </div>
          </div>
          {ev.resumen && <p className="text-xs text-slate-300 leading-relaxed mt-1">{ev.resumen}</p>}
          {ev.acuerdo_alcanzado && <p className="text-[11px] text-emerald-400/80 font-mono mt-1.5">✅ {ev.acuerdo_alcanzado}</p>}
          {ev.proxima_accion && <p className="text-[11px] text-amber-400/80 font-mono mt-1">→ {ev.proxima_accion}</p>}
          {ev.autor && <p className="text-[10px] text-slate-600 font-mono mt-1.5">{ev.autor}</p>}
        </div>
      ))}
    </div>
  );
};

/** Sparkline — Mini gráfico SVG de tendencia para series de datos de reputación GBP. */
const Sparkline = ({ points, color = '#10b981', height = 40 }) => {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 200;
  const pad = 4;
  const step = (w - pad * 2) / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = pad + i * step;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={height} className="overflow-visible">
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((v, i) => {
        const [x, y] = coords[i].split(',');
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
      })}
    </svg>
  );
};

/** FichaDetalle — Detalle expandido de una ficha Google Business Profile con rating, reseñas y sentiment. */
const FichaDetalle = ({ ficha, historico, n8nUrl, clienteId, onValidar }) => {
  const parseSentiment = (s) => {
    if (!s) return null;
    if (typeof s === 'object') return s;
    try { return JSON.parse(s); } catch { return null; }
  };
  const sentimentData    = parseSentiment(ficha.gmaps_sentiment);
  const breakdown        = sentimentData?.breakdown || null;
  const overallSentiment = typeof sentimentData?.sentiment === 'number' ? sentimentData.sentiment : null;
  const histRating  = historico?.map(h => h.gmaps_rating  ? Number(h.gmaps_rating)  : null).filter(Boolean) || [];
  const histReseñas = historico?.map(h => h.gmaps_reseñas ? Number(h.gmaps_reseñas) : null).filter(Boolean) || [];
  const histFechas  = historico?.map(h => h.fecha_snapshot
    ? fmtMesAno(h.fecha_snapshot) : '').filter(Boolean) || [];

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Rating + reseñas */}
      <div className="border border-slate-700 rounded-sm p-4 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="flex items-center gap-1.5">
              <Star size={18} className="text-amber-400 fill-amber-400" />
              <span className="text-3xl font-black text-white font-mono">
                {ficha.gmaps_rating ? Number(ficha.gmaps_rating).toFixed(1) : '—'}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">Valoración</p>
          </div>
          <div className="w-px h-10 bg-slate-700 shrink-0" />
          <div className="text-center">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={16} className="text-slate-500" />
              <span className="text-2xl font-black text-slate-200 font-mono">{ficha.gmaps_reseñas || '—'}</span>
            </div>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">Reseñas</p>
          </div>
          {ficha.gmaps_url && (
            <>
              <div className="w-px h-10 bg-slate-700 shrink-0" />
              <a href={ficha.gmaps_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors">
                <MapPin size={12} /> Ver en Maps
              </a>
            </>
          )}
        </div>
      </div>

      {ficha.gmaps_address && (
        <div className="flex items-start gap-2 text-xs text-slate-400 font-mono">
          <MapPin size={12} className="text-slate-600 mt-0.5 shrink-0" />
          {ficha.gmaps_address}
        </div>
      )}

      {/* Evolución */}
      {historico?.length >= 2 && (
        <div className="border border-slate-700 rounded-sm p-4 bg-slate-900/50">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
            <TrendingUp size={10} /> Evolución ({historico.length} snapshots)
          </p>
          <div className="grid grid-cols-2 gap-4">
            {histRating.length >= 2 && (
              <div>
                <p className="text-[9px] text-slate-600 font-mono mb-1.5 flex items-center gap-1">
                  <Star size={8} className="text-amber-400" /> Valoración
                </p>
                <Sparkline points={histRating} color="#f59e0b" height={36} />
                <div className="flex justify-between text-[9px] text-slate-700 font-mono mt-1">
                  <span>{histFechas[0]}</span><span>{histFechas[histFechas.length - 1]}</span>
                </div>
              </div>
            )}
            {histReseñas.length >= 2 && (
              <div>
                <p className="text-[9px] text-slate-600 font-mono mb-1.5 flex items-center gap-1">
                  <MessageSquare size={8} /> Reseñas
                </p>
                <Sparkline points={histReseñas} color="#6366f1" height={36} />
                <div className="flex justify-between text-[9px] text-slate-700 font-mono mt-1">
                  <span>{histFechas[0]}</span><span>{histFechas[histFechas.length - 1]}</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 overflow-auto max-h-28">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="text-slate-600 border-b border-slate-800">
                  <th className="text-left pb-1">Fecha</th>
                  <th className="text-right pb-1">⭐</th>
                  <th className="text-right pb-1">Reseñas</th>
                </tr>
              </thead>
              <tbody>
                {[...historico].reverse().map((h, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="py-0.5 text-slate-500">{fmtFecha(h.fecha_snapshot)}</td>
                    <td className="py-0.5 text-right text-amber-400">{h.gmaps_rating ? Number(h.gmaps_rating).toFixed(1) : '—'}</td>
                    <td className="py-0.5 text-right text-slate-300">{h.gmaps_reseñas ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sentiment */}
      {(overallSentiment !== null || breakdown) && (
        <div className="border border-slate-700 rounded-sm p-4 bg-slate-900/50">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
            <TrendingUp size={10} /> Análisis de sentimiento
          </p>
          {overallSentiment !== null && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-slate-500 font-mono w-20 shrink-0">General</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                {/* width requiere inline style para valor dinámico en %; Tailwind JIT no genera valores arbitrarios en runtime */}
                <div
                  className={`h-full rounded-full ${overallSentiment >= 0.7 ? 'bg-emerald-500' : overallSentiment >= 0.4 ? 'bg-amber-400' : 'bg-red-500'}`}
                  style={{ width: `${Math.round(overallSentiment * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono w-8 text-right text-slate-300">{Math.round(overallSentiment * 100)}%</span>
            </div>
          )}
          {breakdown && (
            <div className="flex flex-col gap-1.5">
              {Object.entries(breakdown).map(([k, v]) => (
                <SentimentBar key={k} label={k} value={typeof v === 'number' ? v : null}
                  color={v >= 0.7 ? 'bg-emerald-500' : v >= 0.4 ? 'bg-amber-400' : 'bg-red-500'} />
              ))}
            </div>
          )}
        </div>
      )}

      {ficha.google_cid && <p className="text-[10px] text-slate-700 font-mono">CID: {ficha.google_cid}</p>}
    </div>
  );
};

/** SentimentBar — Barra de progreso de sentimiento con etiqueta y porcentaje para análisis GBP. */
/* ─── TAB: Google Business ─── */
const SentimentBar = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-slate-500 font-mono w-20 shrink-0">{label}</span>
    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
      {/* width requiere inline style para valor dinámico en %; Tailwind JIT no genera valores arbitrarios en runtime */}
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.round((value || 0) * 100)}%` }}
      />
    </div>
    <span className="text-[10px] text-slate-400 font-mono w-8 text-right">{value ? `${Math.round(value * 100)}%` : '—'}</span>
  </div>
);

const TabGBP = ({ cliente, n8nUrl }) => {
  const [fichas,      setFichas]      = useState(null);   // gmaps_fichas[]
  const [selIdx,      setSelIdx]      = useState(0);       // ficha seleccionada
  const [historico,   setHistorico]   = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [addMode,     setAddMode]     = useState(false);
  const [newFicha,    setNewFicha]    = useState({ tipo: '', gmaps_nombre: '', gmaps_url: '', gestionada_por_bybusiness: false });
  const [saving,      setSaving]      = useState(false);

  // Cargar fichas desde la tabla gmaps_fichas
  const fetchFichas = () => {
    fetch(`${n8nUrl}/crm-gbp-fichas?cliente_id=${cliente.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.fichas?.length > 0) {
          setFichas(d.fichas);
        } else {
          // Fallback: construir ficha "principal" desde campos legacy del cliente
          const legacy = {
            id: null, tipo: 'principal',
            gmaps_nombre:    cliente.gmaps_nombre || cliente.nombre_comercial,
            gmaps_url:       cliente.gmaps_url,
            google_cid:      cliente.google_cid,
            gmaps_rating:    cliente.gmaps_rating,
            gmaps_reseñas:   cliente.gmaps_reseñas,
            gmaps_address:   cliente.gmaps_address,
            gmaps_sentiment: cliente.gmaps_sentiment,
            gmaps_pendiente_validar: cliente.gmaps_pendiente_validar,
            gestionada_por_bybusiness: false,
            gmaps_last_updated: cliente.gmaps_last_updated,
          };
          setFichas(legacy.gmaps_rating || legacy.gmaps_url ? [legacy] : []);
        }
      })
      .catch(() => setFichas([]));
  };

  useEffect(() => {
    fetchFichas();
  // fetchFichas es estable dentro del render; n8nUrl es constante de build, no reactiva
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  useEffect(() => {
    fetch(`${n8nUrl}/crm-gbp-historico-cliente?cliente_id=${cliente.id}`)
      .then(r => r.json())
      .then(d => setHistorico(d.ok ? d.historico : []))
      .catch(() => setHistorico([]));
  // n8nUrl es constante de build, no reactiva
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  const fichaActual = fichas?.[selIdx] || null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const localidad = cliente.localidad_negocio || cliente.localidad || '';
      const query = `${cliente.nombre_comercial}${localidad ? ' ' + localidad : ''}`;
      await fetch(`${n8nUrl}/crm-gbp-refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, query }),
      });
      fetchFichas();
    } catch { /* error de red — finally restablece el estado */ } finally { setRefreshing(false); }
  };

  const handleValidar = async (fichaId, accion) => {
    try {
      await fetch(`${n8nUrl}/crm-gbp-validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, ficha_id: fichaId, accion }),
      });
      fetchFichas();
    } catch { fetchFichas(); /* error de red — recarga fichas para revertir UI */ }
  };

  const handleAddFicha = async () => {
    if (!newFicha.tipo || !newFicha.gmaps_url) return;
    setSaving(true);
    try {
      await fetch(`${n8nUrl}/crm-gbp-ficha-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, ...newFicha }),
      });
      setAddMode(false);
      setNewFicha({ tipo: '', gmaps_nombre: '', gmaps_url: '', gestionada_por_bybusiness: false });
      fetchFichas();
    } catch { /* error de red — finally restablece el estado */ } finally { setSaving(false); }
  };

  if (fichas === null) return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {[1, 2].map(i => <div key={i} className="h-16 bg-slate-800/40 rounded-sm animate-pulse" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">
          {fichas.length} {fichas.length === 1 ? 'ficha' : 'fichas'} registradas
        </p>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-slate-700 rounded-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50">
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Buscando…' : 'Actualizar'}
        </button>
      </div>

      {/* Lista de fichas (pestañas) */}
      {fichas.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {fichas.map((f, i) => (
            <button key={i} onClick={() => setSelIdx(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                selIdx === i
                  ? 'bg-slate-800 border-slate-600 text-white'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
              }`}>
              {f.gestionada_por_bybusiness && <BadgeCheck size={9} className="text-[#D00000]" />}
              {f.tipo || 'principal'}
              {f.gmaps_pendiente_validar && <AlertTriangle size={9} className="text-amber-400" />}
              {f.gmaps_rating && (
                <span className="text-amber-400 ml-1">{Number(f.gmaps_rating).toFixed(1)}★</span>
              )}
            </button>
          ))}
          <button onClick={() => setAddMode(a => !a)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-dashed border-slate-700 text-slate-600 hover:text-slate-400 hover:border-slate-500 text-[10px] font-mono transition-colors">
            <Plus size={10} /> Añadir
          </button>
        </div>
      )}

      {/* Formulario añadir ficha */}
      {addMode && (
        <div className="border border-slate-700 rounded-sm p-3 bg-slate-900/50 flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Nueva ficha</p>
          <input placeholder="Tipo (barberia, tatuajes, local_2…)" value={newFicha.tipo}
            onChange={e => setNewFicha(f => ({ ...f, tipo: e.target.value }))}
            className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full" />
          <input placeholder="Nombre en Maps" value={newFicha.gmaps_nombre}
            onChange={e => setNewFicha(f => ({ ...f, gmaps_nombre: e.target.value }))}
            className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full" />
          <input placeholder="URL de Google Maps *" value={newFicha.gmaps_url}
            onChange={e => setNewFicha(f => ({ ...f, gmaps_url: e.target.value }))}
            className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full" />
          <label className="flex items-center gap-2 text-[10px] text-slate-500 font-mono cursor-pointer">
            <input type="checkbox" checked={newFicha.gestionada_por_bybusiness}
              onChange={e => setNewFicha(f => ({ ...f, gestionada_por_bybusiness: e.target.checked }))}
              className="accent-[#D00000]" />
            Gestionada por ByBusiness
          </label>
          <div className="flex gap-2">
            <button onClick={handleAddFicha} disabled={saving || !newFicha.tipo || !newFicha.gmaps_url}
              className="flex-1 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-slate-600 rounded-sm text-slate-300 hover:text-white transition-colors disabled:opacity-40">
              {saving ? 'Guardando…' : 'Guardar ficha'}
            </button>
            <button onClick={() => setAddMode(false)}
              className="px-3 py-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Sin fichas */}
      {fichas.length === 0 && !addMode && (
        <div className="text-center py-10 flex flex-col items-center gap-3">
          <AlertCircle size={24} className="text-slate-700" />
          <p className="text-slate-600 text-xs font-mono">Sin fichas de Google Business</p>
          <p className="text-slate-700 text-[10px] font-mono">Pulsa "Actualizar" para buscar o "Añadir" para registrar manualmente</p>
        </div>
      )}

      {/* Detalle ficha seleccionada */}
      {fichaActual && (
        <>
          {/* Banner pendiente */}
          {fichaActual.gmaps_pendiente_validar && (
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-sm p-3 flex items-start gap-3">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-300 mb-0.5">Ficha pendiente de validación</p>
                <p className="text-[10px] text-amber-500/80 font-mono">
                  Encontrada automáticamente — ¿es la ficha correcta?
                </p>
                {fichaActual.gmaps_url && (
                  <a href={fichaActual.gmaps_url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-mono mt-1 block truncate">
                    {fichaActual.gmaps_url}
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => handleValidar(fichaActual.id, 'confirmar')}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  <CheckCircle size={9} /> Sí
                </button>
                <button onClick={() => handleValidar(fichaActual.id, 'rechazar')}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors">
                  <XCircle size={9} /> No
                </button>
              </div>
            </div>
          )}

          {/* Nombre Maps + ByBusiness badge */}
          {fichaActual.gmaps_nombre && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-300 font-mono">{fichaActual.gmaps_nombre}</p>
              {fichaActual.gestionada_por_bybusiness && (
                <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#D00000]/10 border border-[#D00000]/20 text-[#D00000]/80">
                  <BadgeCheck size={9} /> ByBusiness
                </span>
              )}
              <p className="text-[10px] text-slate-600 font-mono ml-auto">
                {fichaActual.gmaps_last_updated ? `↻ ${fmtFecha(fichaActual.gmaps_last_updated)}` : ''}
              </p>
            </div>
          )}

          <FichaDetalle ficha={fichaActual} historico={historico} n8nUrl={n8nUrl} clienteId={cliente.id} />
        </>
      )}
    </div>
  );
};

/**
 * ClienteDrawer — Drawer/modal de ficha completa de un cliente de cartera.
 * Contiene tabs de Ficha, Contratos, Historial de interacciones y Google Business Profile.
 * @param {object}   cliente   - Objeto cliente con todos sus campos de cartera
 * @param {string|number} gestorId - ID del gestor autenticado, para registrar interacciones
 * @param {Function} onClose   - Callback invocado al cerrar el drawer
 */
const ClienteDrawer = ({ cliente, gestorId, onClose }) => {
  const [activeTab, setActiveTab] = useState('ficha');
  const [timeline, setTimeline]   = useState(null);
  const [showModal, setShowModal] = useState(false);

  const N8N = import.meta.env.VITE_N8N_URL;

  const fetchTimeline = () => {
    fetch(`${N8N}/crm-interacciones-cliente?cliente_id=${cliente.id}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setTimeline(d.timeline); })
      .catch(() => setTimeline([]));
  };

  useEffect(() => {
    fetchTimeline();
  // fetchTimeline es estable dentro del render; N8N es constante de módulo, no reactiva
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  const handleSaved = () => {
    setShowModal(false);
    fetchTimeline();
    setActiveTab('historial');
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

        {/* Tabs */}
        <div className="flex border-b border-slate-800 shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                activeTab === t.id
                  ? 'text-white border-b-2 border-[#D00000] -mb-px'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'ficha'     && <TabFicha     cliente={cliente} n8nUrl={N8N} />}
          {activeTab === 'contratos' && <TabContratos cliente={cliente} n8nUrl={N8N} />}
          {activeTab === 'historial' && <TabHistorial timeline={timeline} />}
          {activeTab === 'gbp'       && <TabGBP       cliente={cliente} n8nUrl={N8N} />}
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
