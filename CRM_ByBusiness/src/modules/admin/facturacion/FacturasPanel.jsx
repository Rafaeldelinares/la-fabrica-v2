import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import EmptyState from '../../../shared/ui/EmptyState';
import {
  FileText, ExternalLink, ChevronDown, ChevronRight,
  MessageCircle, Mail, Building2,
} from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';
import { n8nGet, n8nPost } from '../../../shared/hooks/useN8n';

const fmtEur = (v) => v != null ? `${parseFloat(v).toFixed(2)} €` : '—';

const ESTADO_BADGE = {
  emitida: 'bg-blue-900/50 text-blue-300',
  cobrada: 'bg-emerald-900/50 text-emerald-300',
  vencida: 'bg-red-900/50 text-red-400',
  anulada: 'bg-slate-700 text-slate-500',
};

const COLOR_CANAL = {
  pendiente: 'text-slate-500 hover:text-slate-300',
  enviado:   'text-amber-400 hover:text-amber-300',
  aceptado:  'text-emerald-400 hover:text-emerald-300',
  rechazado: 'text-red-500 hover:text-red-400',
  activo:    'text-emerald-400 hover:text-emerald-300',
  inactivo:  'text-slate-600 cursor-not-allowed',
};

const ESTADOS_FACTURA = ['emitida', 'cobrada', 'vencida', 'anulada'];

const ORDEN_OPCIONES = [
  { value: 'fecha_desc',  label: 'Fecha ↓' },
  { value: 'fecha_asc',   label: 'Fecha ↑' },
  { value: 'total_desc',  label: 'Total ↓' },
  { value: 'total_asc',   label: 'Total ↑' },
  { value: 'cliente_asc', label: 'Cliente A→Z' },
];

/** Botón de acción con icono — estado visual vía COLOR_CANAL. */
function ActionIcon({ icon: Icon, estado, onClick, disabled, title }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`p-1 transition-colors rounded-sm ${COLOR_CANAL[estado] ?? COLOR_CANAL.pendiente}`}
    >
      <Icon size={14} />
    </button>
  );
}

ActionIcon.propTypes = {
  icon:     PropTypes.elementType.isRequired,
  title:    PropTypes.string.isRequired,
  onClick:  PropTypes.func,
  estado:   PropTypes.string,
  disabled: PropTypes.bool,
};

/**
 * FilaFactura — fila expandible con líneas y pagos.
 * @param {{ factura: object, busy: string|null, onAccion: Function }} props
 */
function FilaFactura({ factura: f, busy, onAccion }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-800/60">
      {/* Fila principal */}
      <div
        className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-slate-800/20 transition-colors"
        onClick={() => setExpanded(p => !p)}
      >
        {expanded
          ? <ChevronDown size={11} className="text-slate-600 shrink-0" />
          : <ChevronRight size={11} className="text-slate-600 shrink-0" />}

        <span className="text-xs font-mono font-bold text-white w-36 shrink-0">{f.numero}</span>

        <span className="text-xs font-mono text-slate-400 w-24 shrink-0">{fmtFecha(f.fecha_emision)}</span>

        <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0 ${ESTADO_BADGE[f.estado] || ESTADO_BADGE.emitida}`}>
          {f.estado}
        </span>

        <span className="text-xs font-mono font-bold text-white ml-auto shrink-0">
          {fmtEur(f.total_con_iva)}
        </span>

        <div className="flex items-center gap-0.5 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
          <ActionIcon
            icon={FileText}
            estado={f.pdf_url ? 'activo' : 'pendiente'}
            title={f.pdf_url ? 'Ver Factura PDF' : 'Generar PDF'}
            onClick={() => f.pdf_url
              ? window.open(f.pdf_url, '_blank')
              : onAccion('crm-factura-generar-pdf', { factura_id: f.id }, `pdf-${f.id}`)
            }
            disabled={busy === `pdf-${f.id}`}
          />
          <ActionIcon
            icon={MessageCircle}
            estado={!f.pdf_url ? 'inactivo' : (f.whatsapp_estado || 'pendiente')}
            title={!f.pdf_url ? 'Genera el PDF primero' : `WhatsApp: ${f.whatsapp_estado || 'pendiente'}`}
            onClick={() => f.pdf_url && onAccion('crm-factura-enviar-wa', { factura_id: f.id }, `wa-${f.id}`)}
            disabled={!f.pdf_url || busy === `wa-${f.id}`}
          />
          <ActionIcon
            icon={Mail}
            estado={!f.pdf_url ? 'inactivo' : (f.email_estado || 'pendiente')}
            title={!f.pdf_url ? 'Genera el PDF primero' : `Email: ${f.email_estado || 'pendiente'}`}
            onClick={() => f.pdf_url && onAccion('crm-factura-enviar-email', { factura_id: f.id }, `em-${f.id}`)}
            disabled={!f.pdf_url || busy === `em-${f.id}`}
          />
        </div>
      </div>

      {/* Detalle expandido: líneas + pagos */}
      {expanded && (
        <div className="px-10 pb-3 flex flex-col gap-3">
          {/* Líneas */}
          {(f.lineas || []).length > 0 && (
            <table className="w-full text-[10px] font-mono text-slate-400">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left pb-1 font-normal text-slate-500">Descripción</th>
                  <th className="text-right pb-1 pl-3 font-normal text-slate-500">Cant.</th>
                  <th className="text-right pb-1 pl-3 font-normal text-slate-500">Precio</th>
                  <th className="text-right pb-1 pl-3 font-normal text-slate-500">Dto%</th>
                  <th className="text-right pb-1 pl-3 font-normal text-slate-500">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {f.lineas.map(l => (
                  <tr key={l.id} className="border-b border-slate-900">
                    <td className="py-1 text-slate-300">{l.descripcion}</td>
                    <td className="py-1 pl-3 text-right">{l.cantidad}</td>
                    <td className="py-1 pl-3 text-right">{Number(l.precio_unitario).toFixed(2)}€</td>
                    <td className="py-1 pl-3 text-right">{l.dto_pct ?? 0}%</td>
                    <td className="py-1 pl-3 text-right text-slate-200">{Number(l.subtotal).toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagos */}
          {(f.pagos || []).length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">Pagos</p>
              {f.pagos.map(p => (
                <div key={p.id} className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                  <span className="w-28 shrink-0">{fmtFecha(p.fecha_vencimiento)}</span>
                  <span className="text-slate-300 font-bold">{fmtEur(p.importe)}</span>
                  <span className={`px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-widest shrink-0 ${p.estado === 'cobrado' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/50 text-amber-300'}`}>
                    {p.estado}
                  </span>
                  {p.metodo && <span className="text-slate-600">{p.metodo}</span>}
                  {p.estado !== 'cobrado' && (
                    <button
                      onClick={() => onAccion('crm-pago-cobrar', { pago_id: p.id, metodo: p.metodo || 'transferencia' }, `cobrar-${p.id}`)}
                      disabled={busy === `cobrar-${p.id}`}
                      className="ml-auto text-[9px] font-mono uppercase tracking-widest border border-emerald-800 text-emerald-400 hover:bg-emerald-900/30 px-2 py-0.5 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Cobrar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

FilaFactura.propTypes = {
  factura:  PropTypes.object.isRequired,
  busy:     PropTypes.string,
  onAccion: PropTypes.func.isRequired,
};

/**
 * FacturasPanel — Vista global de facturas agrupadas por cliente con búsqueda y filtros.
 * El nombre de empresa es clickeable y abre la ficha del cliente.
 * @param {{ onAbrirCliente: Function, reloadKey: number }} props
 */
const FacturasPanel = ({ onAbrirCliente, reloadKey }) => {
  const [grupos,       setGrupos]       = useState(null);
  const [expandidos,   setExpandidos]   = useState({});
  const [busy,         setBusy]         = useState(null);
  const [busqueda,     setBusqueda]     = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [orden,        setOrden]        = useState('fecha_desc');

  const loadData = useCallback(() => {
    n8nGet('crm-facturas')
      .then(d => {
        const lista = d.facturas || [];
        const mapa = {};
        lista.forEach(f => {
          const cid = f.cliente_id || 0;
          if (!mapa[cid]) mapa[cid] = { cliente_id: cid, nombre_comercial: f.nombre_comercial || '—', facturas: [] };
          mapa[cid].facturas.push(f);
        });
        const agrupados = Object.values(mapa).sort((a, b) =>
          (a.nombre_comercial || '').localeCompare(b.nombre_comercial || '')
        );
        setGrupos(agrupados);
        setExpandidos({});
      })
      .catch(() => setGrupos([]));
  }, []);

  useEffect(() => {
    setBusqueda('');
    setFiltroEstado('todos');
    setOrden('fecha_desc');
    loadData();
  }, [reloadKey, loadData]);

  const accion = async (endpoint, body, key) => {
    setBusy(key);
    try {
      const d = await n8nPost(endpoint, body);
      if (d.ok || d.id || d.factura_id || d.pago_id) loadData();
    } catch (err) {
      console.error('[FacturasPanel] accion error:', err);
    } finally { setBusy(null); }
  };

  const toggleGrupo = (cid) => setExpandidos(p => ({ ...p, [cid]: !p[cid] }));

  /** Grupos filtrados y ordenados según búsqueda, estado y orden activos. */
  const gruposFiltrados = useMemo(() => {
    if (!grupos) return [];
    const term = busqueda.trim().toLowerCase();

    let resultado = grupos.reduce((acc, g) => {
      let facts = g.facturas;

      // Filtro por estado
      if (filtroEstado !== 'todos') {
        facts = facts.filter(f => f.estado === filtroEstado);
      }

      if (term) {
        const matchCliente = (g.nombre_comercial || '').toLowerCase().includes(term);
        if (matchCliente) {
          // mostrar todo el grupo (ya filtrado por estado)
        } else {
          // mostrar solo facturas cuyo numero coincida
          facts = facts.filter(f => (f.numero || '').toLowerCase().includes(term));
        }
      }

      if (facts.length === 0) return acc;
      acc.push({ ...g, facturas: facts });
      return acc;
    }, []);

    // Ordenar grupos
    switch (orden) {
      case 'cliente_asc':
        resultado = [...resultado].sort((a, b) =>
          (a.nombre_comercial || '').localeCompare(b.nombre_comercial || ''));
        break;
      case 'fecha_desc':
        resultado = [...resultado].sort((a, b) => {
          const fa = Math.max(...a.facturas.map(f => new Date(f.fecha_emision || 0).getTime()));
          const fb = Math.max(...b.facturas.map(f => new Date(f.fecha_emision || 0).getTime()));
          return fb - fa;
        });
        break;
      case 'fecha_asc':
        resultado = [...resultado].sort((a, b) => {
          const fa = Math.min(...a.facturas.map(f => new Date(f.fecha_emision || 0).getTime()));
          const fb = Math.min(...b.facturas.map(f => new Date(f.fecha_emision || 0).getTime()));
          return fa - fb;
        });
        break;
      case 'total_desc':
        resultado = [...resultado].sort((a, b) => {
          const ta = a.facturas.reduce((s, f) => s + parseFloat(f.total_con_iva || 0), 0);
          const tb = b.facturas.reduce((s, f) => s + parseFloat(f.total_con_iva || 0), 0);
          return tb - ta;
        });
        break;
      case 'total_asc':
        resultado = [...resultado].sort((a, b) => {
          const ta = a.facturas.reduce((s, f) => s + parseFloat(f.total_con_iva || 0), 0);
          const tb = b.facturas.reduce((s, f) => s + parseFloat(f.total_con_iva || 0), 0);
          return ta - tb;
        });
        break;
      default:
        break;
    }
    return resultado;
  }, [grupos, busqueda, filtroEstado, orden]);

  if (grupos === null) return (
    <div className="flex flex-col gap-2 p-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-800 rounded-sm" />)}
    </div>
  );

  if (grupos.length === 0) return (
    <div className="flex items-center justify-center py-20">
      <EmptyState
        title="Sin facturas"
        icon={FileText}
        description="Las facturas se generan al aceptar una proforma con 'Requiere factura' activado"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barra de filtros */}
      <div className="shrink-0 bg-slate-950/50 border-b border-slate-800 px-4 py-2 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar cliente o nº factura..."
          className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 placeholder:text-slate-700 flex-1 min-w-0 max-w-xs"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 shrink-0"
        >
          <option value="todos">Estado: Todos</option>
          {ESTADOS_FACTURA.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={orden}
          onChange={e => setOrden(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 shrink-0"
        >
          {ORDEN_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Listado */}
      {gruposFiltrados.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <EmptyState title="Sin coincidencias" icon={FileText} description="Ninguna factura coincide con los filtros aplicados" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {gruposFiltrados.map(g => (
            <div key={g.cliente_id} className="border-b border-slate-700">
              {/* Cabecera de cliente */}
              <div
                className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/60 cursor-pointer hover:bg-slate-800/40 transition-colors"
                onClick={() => toggleGrupo(g.cliente_id)}
              >
                {expandidos[g.cliente_id]
                  ? <ChevronDown size={12} className="text-slate-500 shrink-0" />
                  : <ChevronRight size={12} className="text-slate-500 shrink-0" />}
                <Building2 size={11} className="text-slate-600 shrink-0" />
                <button
                  onClick={e => { e.stopPropagation(); onAbrirCliente(g.cliente_id); }}
                  className="group flex items-center gap-1 text-left"
                >
                  <span className="text-xs font-black uppercase tracking-wide text-slate-200 group-hover:text-blue-400 transition-colors">
                    {g.nombre_comercial}
                  </span>
                  <ExternalLink size={9} className="text-slate-700 group-hover:text-blue-400 transition-colors" />
                </button>
                <span className="ml-auto text-[10px] font-mono text-slate-600">
                  {g.facturas.length} factura{g.facturas.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Facturas del cliente */}
              {expandidos[g.cliente_id] && g.facturas.map(f => (
                <FilaFactura
                  key={f.id}
                  factura={f}
                  busy={busy}
                  onAccion={accion}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

FacturasPanel.propTypes = {
  onAbrirCliente: PropTypes.func.isRequired,
  reloadKey:      PropTypes.number.isRequired,
};

export default FacturasPanel;
