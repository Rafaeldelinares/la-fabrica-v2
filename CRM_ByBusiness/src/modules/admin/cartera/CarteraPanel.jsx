import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Users, Search, AlertTriangle, CalendarClock, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Plus, MapPin, BadgeCheck } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import ClienteDrawer from './ClienteDrawer';
import NuevoClienteDrawer from './NuevoClienteDrawer';
import { useAuth } from '../../auth/AuthContext';

const PAGE_SIZE = 15;

const SEMAFORO_CONFIG = {
  verde: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Al día',    desc: 'Contacto en los últimos 30 días, sin pagos pendientes ni renovaciones urgentes.' },
  ambar: { dot: 'bg-amber-400',   badge: 'bg-amber-400/10  text-amber-400  border-amber-400/20',   label: 'Atención', desc: 'Sin contacto entre 30-60 días, renovación próxima o pagos pendientes.' },
  rojo:  { dot: 'bg-red-500',     badge: 'bg-red-500/10    text-red-400    border-red-500/20',     label: 'Críticos',  desc: 'Sin contacto más de 60 días, sin historial registrado o pagos vencidos.' },
};

/**
 * Formatea días de antigüedad en texto legible: Hoy / Ayer / Nd.
 * @param {number|null|undefined} dias
 * @returns {string}
 */
const fmtDias = (dias) => {
  if (dias === null || dias === undefined) return '—';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `${dias}d`;
};


/**
 * SortIcon — Indicador visual del campo ordenado actualmente en la tabla.
 * @param {{ field: string, sort: { field: string, dir: string } }} props
 */
const SortIcon = ({ field, sort }) => {
  if (sort.field !== field) return <ChevronsUpDown size={10} className="text-slate-700 ml-1" />;
  return sort.dir === 'asc'
    ? <ChevronUp size={10} className="text-[#D00000] ml-1" />
    : <ChevronDown size={10} className="text-[#D00000] ml-1" />;
};

SortIcon.propTypes = {
  /** Campo por el que se está ordenando actualmente */
  field: PropTypes.string.isRequired,
  /** Estado actual del sort: { field, dir } */
  sort:  PropTypes.shape({ field: PropTypes.string.isRequired, dir: PropTypes.oneOf(['asc', 'desc']).isRequired }).isRequired,
};

/**
 * CarteraPanel — Panel principal de gestión de la cartera de clientes.
 * Muestra la tabla paginada de clientes con filtros por semáforo y año,
 * y abre el drawer de ficha de cliente o el alta de nueva empresa en modal.
 */
const CarteraPanel = () => {
  const { user } = useAuth();
  const [clientes, setClientes]         = useState(null);
  const [filtroSemaforo, setFiltroSemaforo] = useState('');
  const [filtroAnio,     setFiltroAnio] = useState(String(new Date().getFullYear()));
  const [busqueda, setBusqueda]         = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [sort, setSort]                 = useState({ field: 'nombre_comercial', dir: 'asc' });
  const [pagina, setPagina]             = useState(1);
  const [error, setError]               = useState('');

  const N8N = import.meta.env.VITE_N8N_URL;

  useEffect(() => {
    fetch(`${N8N}/crm-cartera-get`)
      .then(res => res.json())
      .then(data => { if (data.ok) setClientes(data.clientes); else setError('Error al cargar la cartera — respuesta inesperada'); })
      .catch(() => { setClientes([]); setError('Error al cargar la cartera — comprueba la conexión'); });
  // N8N es constante de módulo, no reactiva
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aniosDisponibles = useMemo(() => {
    if (!clientes) return [];
    const set = new Set(clientes.map(c => c.año_alta).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [clientes]);

  const filtrados = useMemo(() => {
    if (!clientes) return [];
    return clientes.filter(c => {
      if (filtroSemaforo && c.semaforo !== filtroSemaforo) return false;
      if (filtroAnio && String(c.año_alta) !== String(filtroAnio)) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (c.nombre_comercial || '').toLowerCase().includes(q)
          || (c.localidad || '').toLowerCase().includes(q)
          || (c.email || '').toLowerCase().includes(q)
          || (c.telefono || '').includes(q);
      }
      return true;
    });
  }, [clientes, filtroSemaforo, filtroAnio, busqueda]);

  // Stats siempre sobre año+búsqueda (nunca sobre filtro de semáforo)
  // para que los contadores reflejen la distribución real, no el filtro activo.
  const stats = useMemo(() => {
    if (!clientes) return { total: 0, verde: 0, ambar: 0, rojo: 0 };
    const base = clientes.filter(c => {
      if (filtroAnio && String(c.año_alta) !== String(filtroAnio)) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (c.nombre_comercial || '').toLowerCase().includes(q)
          || (c.localidad || '').toLowerCase().includes(q)
          || (c.email || '').toLowerCase().includes(q)
          || (c.telefono || '').includes(q);
      }
      return true;
    });
    return {
      total: base.length,
      verde: base.filter(c => c.semaforo === 'verde').length,
      ambar: base.filter(c => c.semaforo === 'ambar').length,
      rojo:  base.filter(c => c.semaforo === 'rojo').length,
    };
  }, [clientes, filtroAnio, busqueda]);

  const ordenados = useMemo(() => {
    const { field, dir } = sort;
    const mult = dir === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      let va = a[field], vb = b[field];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (field === 'mrr' || field === 'dias_sin_contacto') return (Number(va) - Number(vb)) * mult;
      if (field === 'proxima_renovacion') return (new Date(va) - new Date(vb)) * mult;
      return String(va).localeCompare(String(vb), 'es') * mult;
    });
  }, [filtrados, sort]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados    = ordenados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  const toggleSort = (field) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
    setPagina(1);
  };

  // Reset página al cambiar filtros
  useEffect(() => { setPagina(1); }, [filtroSemaforo, filtroAnio, busqueda]);

  return (
    <div className="flex gap-0 h-full overflow-hidden">

      {/* PANEL — tabla (siempre ocupa todo el ancho) */}
      <div className="flex flex-col gap-4 w-full overflow-hidden">

        {/* Error banner */}
        {error && (
          <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">CARTERA DE CLIENTES</h2>
          <div className="flex items-center gap-2">
            <select
              value={filtroAnio}
              onChange={e => setFiltroAnio(e.target.value)}
              className={`bg-slate-900 border rounded-sm px-3 py-1.5 text-[10px] font-mono outline-none transition-colors cursor-pointer ${
                filtroAnio
                  ? 'border-[#D00000]/40 text-white bg-[#D00000]/5'
                  : 'border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <option value="">Todos los años</option>
              {aniosDisponibles.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
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
            <button
              onClick={() => { setNuevoCliente(true); setSeleccionado(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D00000]/10 hover:bg-[#D00000]/20 border border-[#D00000]/30 hover:border-[#D00000]/60 text-[#D00000] text-[10px] font-mono uppercase tracking-widest rounded-sm transition-colors"
            >
              <Plus size={12} /> Nueva empresa
            </button>
          </div>
        </div>

        {/* Stats semáforo */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {[
            { key: '', label: 'Total clientes', value: stats.total, dot: 'bg-slate-500', desc: null },
            { key: 'verde', ...SEMAFORO_CONFIG.verde, value: stats.verde },
            { key: 'ambar', ...SEMAFORO_CONFIG.ambar, value: stats.ambar },
            { key: 'rojo',  ...SEMAFORO_CONFIG.rojo,  value: stats.rojo  },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFiltroSemaforo(filtroSemaforo === s.key ? '' : s.key)}
              className={`flex flex-col gap-2 px-4 pt-3 pb-3 rounded-sm border transition-all text-left ${
                filtroSemaforo === s.key
                  ? 'bg-slate-800 border-slate-600'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Parte superior: dot + label + número */}
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{s.label}</p>
                  <p className="text-xl font-black text-white font-mono leading-tight">{clientes === null ? '—' : s.value}</p>
                </div>
              </div>
              {/* Parte inferior: descripción del criterio */}
              {s.desc && (
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed border-t border-slate-800 pt-2">
                  {s.desc}
                </p>
              )}
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
            <div className="flex flex-col h-full">
              <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-xs text-slate-400">
                <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-6"></th>
                    {[
                      { label: 'CLIENTE',          field: 'nombre_comercial'   },
                      { label: 'ÚLTIMO CONTACTO',  field: 'dias_sin_contacto'  },
                      { label: 'RENOVACIÓN',       field: 'proxima_renovacion' },
                      { label: 'ING. MENSUALES',   field: 'mrr'                },
                      { label: 'GESTOR',           field: 'gestor_nombre'      },
                    ].map(({ label, field }) => (
                      <th key={field} onClick={() => toggleSort(field)}
                        className="px-4 py-3 font-mono cursor-pointer hover:text-slate-300 select-none transition-colors">
                        <span className="flex items-center">
                          {label}<SortIcon field={field} sort={sort} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginados.map(c => (
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
                        <div className={`w-2.5 h-2.5 rounded-sm ${SEMAFORO_CONFIG[c.semaforo]?.dot || 'bg-slate-600'}`} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-200 uppercase tracking-wide">{c.nombre_comercial}</p>
                          {c.num_fichas_gbp > 0 && (
                            <span title={`GBP registrado (${c.num_fichas_gbp} ficha${c.num_fichas_gbp > 1 ? 's' : ''})`}>
                              <MapPin size={11} className="text-emerald-400 shrink-0" />
                            </span>
                          )}
                          {c.gmaps_pendiente_validar && (
                            <span title="Ficha GBP pendiente de validación">
                              <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                            </span>
                          )}
                          {c.bybusiness_url
                            ? c.tarjeta_sin_gbp
                              ? <span title="Tarjeta digital registrada — pendiente de enlazar en Google Maps"><BadgeCheck size={11} className="text-amber-400 shrink-0" /></span>
                              : <span title="Tarjeta digital enlazada en Google Maps"><BadgeCheck size={11} className="text-emerald-400 shrink-0" /></span>
                            : <span title="Sin tarjeta digital registrada — oportunidad de producto"><BadgeCheck size={11} className="text-slate-600 shrink-0" /></span>
                          }
                          {c.proxima_accion_fecha && (() => {
                            const dias = Math.ceil((new Date(c.proxima_accion_fecha) - new Date()) / 86400000);
                            const color = dias <= 0 ? 'text-red-400' : dias <= 7 ? 'text-amber-400' : 'text-slate-500';
                            return (
                              <span title={`Próxima acción: ${fmtFecha(c.proxima_accion_fecha)}`}>
                                <CalendarClock size={11} className={`${color} shrink-0`} />
                              </span>
                            );
                          })()}
                        </div>
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
                        {c.proxima_renovacion ? (() => {
                          const d   = new Date(c.proxima_renovacion);
                          const now = new Date();
                          const col = d < now
                            ? 'text-slate-600'
                            : d < new Date(Date.now() + 60 * 86400000)
                              ? 'text-amber-400'
                              : 'text-slate-400';
                          return <span className={col}>{fmtFecha(c.proxima_renovacion)}</span>;
                        })() : '—'}
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

              {/* Paginación */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800 shrink-0">
                <span className="text-[10px] text-slate-600 font-mono">
                  {ordenados.length} clientes · pág. {paginaActual}/{totalPaginas}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPagina(1)} disabled={paginaActual === 1}
                    className="px-2 py-1 text-[10px] font-mono text-slate-500 hover:text-white border border-slate-800 hover:border-slate-600 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    «
                  </button>
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1}
                    className="p-1 text-slate-500 hover:text-white border border-slate-800 hover:border-slate-600 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft size={12} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    const offset = Math.max(0, Math.min(paginaActual - 3, totalPaginas - 5));
                    const p = i + 1 + offset;
                    return (
                      <button key={p} onClick={() => setPagina(p)}
                        className={`min-w-[28px] py-1 text-[10px] font-mono border rounded-sm transition-colors ${
                          p === paginaActual
                            ? 'bg-[#D00000]/10 border-[#D00000]/40 text-white'
                            : 'text-slate-500 border-slate-800 hover:text-white hover:border-slate-600'
                        }`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}
                    className="p-1 text-slate-500 hover:text-white border border-slate-800 hover:border-slate-600 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight size={12} />
                  </button>
                  <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas}
                    className="px-2 py-1 text-[10px] font-mono text-slate-500 hover:text-white border border-slate-800 hover:border-slate-600 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    »
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* MODAL — ficha cliente existente */}
      {seleccionado && (
        <div className="fixed top-16 bottom-10 inset-x-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSeleccionado(null)}>
          <div className="w-[90vw] max-w-[1080px] h-full overflow-hidden rounded-sm border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <ClienteDrawer
              cliente={seleccionado}
              gestorId={user?.id}
              onClose={() => setSeleccionado(null)}
              onGestorChanged={({ gestor_id, gestor_nombre }) => {
                setSeleccionado(prev => ({ ...prev, gestor_id, gestor_nombre }));
                setClientes(prev => prev?.map(c => c.id === seleccionado.id ? { ...c, gestor_id, gestor_nombre } : c) ?? prev);
              }}
              onClienteBaja={() => {
                setSeleccionado(null);
                setClientes(prev => prev?.filter(c => c.id !== seleccionado.id) ?? prev);
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL — alta nueva empresa */}
      {nuevoCliente && (
        <div className="fixed top-16 bottom-10 inset-x-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setNuevoCliente(false)}>
          <div className="w-[90vw] max-w-[1080px] h-full overflow-hidden rounded-sm border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <NuevoClienteDrawer
              onClose={() => setNuevoCliente(false)}
              onCreado={(cliente) => {
                setNuevoCliente(false);
                // Recargar cartera e ir directamente al nuevo cliente
                fetch(`${N8N}/crm-cartera-get`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.ok) {
                      setClientes(data.clientes);
                      const nuevo = data.clientes.find(c => c.id === cliente?.id);
                      if (nuevo) setSeleccionado(nuevo);
                    }
                  })
                  .catch(() => { setError('Error al recargar la cartera después del alta'); });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/** Panel autónomo — no recibe props externas */
CarteraPanel.propTypes = {};

export default CarteraPanel;
