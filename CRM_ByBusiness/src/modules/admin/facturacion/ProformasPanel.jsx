import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import EmptyState from '../../../shared/ui/EmptyState';
import {
  FileText, ExternalLink, ChevronDown, ChevronRight,
  CheckCircle, MessageCircle, Mail, Eye, Receipt, RotateCcw, Pencil, X, Building2,
} from 'lucide-react';

const N8N = import.meta.env.VITE_N8N_URL;

const fmtEur = (v) => v != null ? `${parseFloat(v).toFixed(2)} €` : '—';

/** borrador→verificada→pendiente_cliente→aceptada|rechazada */
const ESTADO_BADGE = {
  borrador:          'bg-slate-700 text-slate-300',
  verificada:        'bg-blue-900/50 text-blue-300',
  pendiente_cliente: 'bg-amber-900/50 text-amber-300',
  aceptada:          'bg-emerald-900/50 text-emerald-300',
  rechazada:         'bg-red-900/50 text-red-400',
};

const COLOR_CANAL = {
  pendiente: 'text-slate-500 hover:text-slate-300',
  enviado:   'text-amber-400 hover:text-amber-300',
  aceptado:  'text-emerald-400 hover:text-emerald-300',
  rechazado: 'text-red-500 hover:text-red-400',
  activo:    'text-emerald-400 hover:text-emerald-300',
  warning:   'text-amber-400 hover:text-amber-300',
  inactivo:  'text-slate-600 cursor-not-allowed',
};

const ESTADOS_PROFORMA = ['borrador', 'verificada', 'pendiente_cliente', 'aceptada', 'rechazada'];

const ORDEN_OPCIONES = [
  { value: 'fecha_desc',   label: 'Fecha ↓' },
  { value: 'fecha_asc',    label: 'Fecha ↑' },
  { value: 'total_desc',   label: 'Total ↓' },
  { value: 'total_asc',    label: 'Total ↑' },
  { value: 'cliente_asc',  label: 'Cliente A→Z' },
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
  onClick:  PropTypes.func.isRequired,
  estado:   PropTypes.string,
  disabled: PropTypes.bool,
};

/** Modal de confirmación para reabrir proforma. */
/**
 * ConfirmReabrirModal — Modal de confirmación antes de reabrir una proforma.
 * Informa al operador sobre las consecuencias: vuelta a borrador y obsolescencia del contrato.
 * @param {object}   proforma  - Proforma a reabrir (id, numero)
 * @param {Function} onConfirm - Callback ejecutado al confirmar la reapertura
 * @param {Function} onClose   - Callback para cerrar el modal sin acción
 */
function ConfirmReabrirModal({ proforma, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-sm bg-slate-950 border border-slate-700 rounded-sm shadow-2xl p-5 flex flex-col gap-4"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <p className="text-xs font-black uppercase tracking-widest text-white font-mono">Confirmar reapertura</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-mono text-slate-300">
            Vas a reabrir la proforma{' '}
            <span className="text-white font-black">{proforma.numero || `PF-${proforma.id}`}</span>.
          </p>
          <ul className="flex flex-col gap-1.5 mt-1 pl-3 border-l-2 border-[#D00000]/40">
            <li className="text-[10px] font-mono text-slate-400">
              La proforma volverá a estado <span className="text-slate-200 font-black">borrador</span>.
            </li>
            <li className="text-[10px] font-mono text-slate-400">
              El contrato digital asociado pasará a estado{' '}
              <span className="text-amber-400 font-black">obsoleto</span> y deberá generarse uno nuevo.
            </li>
          </ul>
        </div>
        <div className="flex gap-2 mt-1">
          <button onClick={onConfirm}
            className="flex-1 text-[10px] font-mono uppercase tracking-widest bg-[#D00000] hover:bg-red-800 text-white rounded-sm px-4 py-2 transition-colors">
            Confirmar
          </button>
          <button onClick={onClose}
            className="flex-1 text-[10px] font-mono uppercase tracking-widest border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-sm px-4 py-2 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmReabrirModal.propTypes = {
  proforma:  PropTypes.object.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose:   PropTypes.func.isRequired,
};

/**
 * FilaProforma — Fila de proforma con action icons y expansión de líneas.
 * @param {object}   pf               - Datos de la proforma
 * @param {object}   contrato         - Contrato digital activo vinculado, si existe
 * @param {string}   busy             - Key de la acción en curso, para deshabilitar botones
 * @param {Function} onAccion         - Callback para ejecutar una acción sobre la proforma
 * @param {Function} onConfirmReabrir - Callback para confirmar reapertura de proforma
 */
function FilaProforma({ pf, contrato, busy, onAccion, onConfirmReabrir }) {
  const [expanded, setExpanded] = useState(false);
  const waEstado       = contrato?.whatsapp_estado || 'pendiente';
  const emEstado       = contrato?.email_estado    || 'pendiente';
  const tieneRespuesta = ['aceptado','rechazado'].includes(waEstado) || ['aceptado','rechazado'].includes(emEstado);
  const es             = pf.estado;

  const showPencil   = es === 'borrador';
  const showFileText = es !== 'borrador';
  const showMsgWa    = es !== 'borrador' && es !== 'verificada';
  const showMail     = es !== 'borrador' && es !== 'verificada';
  const showEye      = es === 'aceptada' || tieneRespuesta;
  const showFacturar = es === 'aceptada' && pf.requiere_factura;
  const showReabrir  = es !== 'borrador' && es !== 'aceptada';
  const fileTextDisabled = (!contrato && es === 'pendiente_cliente') || busy === `contrato-${pf.id}`;

  return (
    <div className="border-b border-slate-800/60">
      <div
        className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-slate-800/20 transition-colors"
        onClick={() => setExpanded(p => !p)}
      >
        {expanded
          ? <ChevronDown size={11} className="text-slate-600 shrink-0" />
          : <ChevronRight size={11} className="text-slate-600 shrink-0" />}

        <span className="text-xs font-mono text-slate-400 w-28 shrink-0">{pf.numero || `PF-${pf.id}`}</span>

        <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0 ${ESTADO_BADGE[es] || 'bg-slate-700 text-slate-400'}`}>
          {es}
        </span>

        <span className="text-xs font-mono text-slate-300 ml-auto shrink-0">
          {fmtEur(pf.total)}
          {pf.iva_pct != null && (
            <span className="text-[9px] text-amber-500 ml-1">+IVA {pf.iva_pct}%</span>
          )}
        </span>

        <div className="flex items-center gap-0.5 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
          {showPencil && (
            <ActionIcon icon={Pencil} estado="pendiente" title="Editar proforma (abrir ficha)"
              onClick={() => {}} disabled={false} />
          )}
          <ActionIcon icon={CheckCircle} estado={pf.verificada_admin ? 'activo' : 'pendiente'}
            title={pf.verificada_admin ? 'Verificada por admin' : 'Verificar proforma'}
            onClick={() => onAccion('crm-proforma-verificar', { proforma_id: pf.id }, `verif-${pf.id}`)}
            disabled={busy === `verif-${pf.id}`} />
          {showFileText && (
            <ActionIcon icon={FileText} estado={contrato ? 'activo' : 'pendiente'}
              title={contrato ? 'Ver contrato PDF' : 'Generar contrato digital'}
              onClick={() => !fileTextDisabled && onAccion('crm-70-post-contrato-digital', {
                cliente_id: pf.cliente_id, proforma_id: pf.id,
                objeto: pf.numero || 'Servicios contratados',
                importe_mensual: pf.total || null, canal_envio: 'whatsapp',
              }, `contrato-${pf.id}`)}
              disabled={fileTextDisabled} />
          )}
          {showMsgWa && (
            <ActionIcon icon={MessageCircle} estado={!contrato ? 'inactivo' : waEstado}
              title={!contrato ? 'Genera el contrato primero' : `WhatsApp: ${waEstado}`}
              onClick={() => contrato && onAccion('crm-72-post-contrato-enviar', { contrato_id: contrato.id }, `wa-${pf.id}`)}
              disabled={!contrato || busy === `wa-${pf.id}` || waEstado === 'aceptado'} />
          )}
          {showMail && (
            <ActionIcon icon={Mail} estado={!contrato ? 'inactivo' : emEstado}
              title={!contrato ? 'Genera el contrato primero' : `Email: ${emEstado}`}
              onClick={() => contrato && onAccion('crm-75-post-contrato-email', { contrato_id: contrato.id }, `em-${pf.id}`)}
              disabled={!contrato || busy === `em-${pf.id}` || emEstado === 'aceptado'} />
          )}
          {showEye && (
            <ActionIcon icon={Eye} estado={tieneRespuesta ? 'activo' : 'inactivo'}
              title={tieneRespuesta ? 'Ver evidencia de respuesta' : 'Sin respuesta aún'}
              onClick={() => {}} disabled={!tieneRespuesta} />
          )}
          {showFacturar && (
            <ActionIcon icon={Receipt} estado="activo" title="Generar factura"
              onClick={() => onAccion('crm-factura-generar', { proforma_id: pf.id }, `factura-${pf.id}`)}
              disabled={busy === `factura-${pf.id}`} />
          )}
          {showReabrir && (
            <ActionIcon icon={RotateCcw} estado="warning" title="Reabrir proforma"
              onClick={() => onConfirmReabrir(pf)}
              disabled={busy === `reabrir-${pf.id}`} />
          )}
        </div>
      </div>

      {expanded && (pf.lineas || []).length > 0 && (
        <div className="px-10 pb-3">
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
              {pf.lineas.map(l => (
                <tr key={l.id} className="border-b border-slate-900">
                  <td className="py-1 text-slate-300">{l.descripcion}</td>
                  <td className="py-1 pl-3 text-right">{l.cantidad}</td>
                  <td className="py-1 pl-3 text-right">{Number(l.precio_unitario).toFixed(2)}€</td>
                  <td className="py-1 pl-3 text-right">{l.dto_pct}%</td>
                  <td className="py-1 pl-3 text-right text-slate-200">{Number(l.subtotal).toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

FilaProforma.propTypes = {
  pf:               PropTypes.object.isRequired,
  contrato:         PropTypes.object,
  busy:             PropTypes.string,
  onAccion:         PropTypes.func.isRequired,
  onConfirmReabrir: PropTypes.func.isRequired,
};

/**
 * ProformasPanel — Vista global de proformas agrupadas por cliente con búsqueda y filtros.
 * El nombre de empresa es clickeable y abre la ficha del cliente.
 * @param {{ onAbrirCliente: Function, reloadKey: number }} props
 */
const ProformasPanel = ({ onAbrirCliente, reloadKey }) => {
  const [grupos,        setGrupos]        = useState(null);
  const [contratos,     setContratos]     = useState([]);
  const [expandidos,    setExpandidos]    = useState({});
  const [busy,          setBusy]          = useState(null);
  const [confirmReabrir, setConfirmReabrir] = useState(null);
  const [busqueda,      setBusqueda]      = useState('');
  const [filtroEstado,  setFiltroEstado]  = useState('todos');
  const [orden,         setOrden]         = useState('fecha_desc');

  const loadData = useCallback(() => {
    Promise.all([
      fetch(`${N8N}/crm-proformas`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch(`${N8N}/crm-contratos-digitales-all`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).catch(() => ({ contratos: [] })),
    ])
      .then(([dp, dc]) => {
        const lista = dp.proformas || [];
        const mapa = {};
        lista.forEach(pf => {
          const cid = pf.cliente_id || 0;
          if (!mapa[cid]) mapa[cid] = { cliente_id: cid, nombre_comercial: pf.nombre_comercial || '—', proformas: [] };
          mapa[cid].proformas.push(pf);
        });
        const agrupados = Object.values(mapa).sort((a, b) =>
          (a.nombre_comercial || '').localeCompare(b.nombre_comercial || '')
        );
        setGrupos(agrupados);
        setExpandidos({});
        setContratos(Array.isArray(dc) ? dc : (dc.contratos || []));
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
      const r = await fetch(`${N8N}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok || d.id || d.contrato_id) loadData();
    } catch (err) {
      console.error('[ProformasPanel] accion error:', err);
    } finally { setBusy(null); }
  };

  const toggleGrupo = (cid) => setExpandidos(p => ({ ...p, [cid]: !p[cid] }));

  /** Grupos filtrados y ordenados según búsqueda, estado y orden activos. */
  const gruposFiltrados = useMemo(() => {
    if (!grupos) return [];
    const term = busqueda.trim().toLowerCase();

    let resultado = grupos.reduce((acc, g) => {
      let pfs = g.proformas;

      // Filtro por estado
      if (filtroEstado !== 'todos') {
        pfs = pfs.filter(pf => pf.estado === filtroEstado);
      }

      if (term) {
        const matchCliente = (g.nombre_comercial || '').toLowerCase().includes(term);
        if (!matchCliente) {
          pfs = pfs.filter(pf => (pf.numero || '').toLowerCase().includes(term));
        }
      }

      if (pfs.length === 0) return acc;
      acc.push({ ...g, proformas: pfs });
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
          const fa = Math.max(...a.proformas.map(p => new Date(p.fecha_creacion || 0).getTime()));
          const fb = Math.max(...b.proformas.map(p => new Date(p.fecha_creacion || 0).getTime()));
          return fb - fa;
        });
        break;
      case 'fecha_asc':
        resultado = [...resultado].sort((a, b) => {
          const fa = Math.min(...a.proformas.map(p => new Date(p.fecha_creacion || 0).getTime()));
          const fb = Math.min(...b.proformas.map(p => new Date(p.fecha_creacion || 0).getTime()));
          return fa - fb;
        });
        break;
      case 'total_desc':
        resultado = [...resultado].sort((a, b) => {
          const ta = a.proformas.reduce((s, p) => s + parseFloat(p.total || 0), 0);
          const tb = b.proformas.reduce((s, p) => s + parseFloat(p.total || 0), 0);
          return tb - ta;
        });
        break;
      case 'total_asc':
        resultado = [...resultado].sort((a, b) => {
          const ta = a.proformas.reduce((s, p) => s + parseFloat(p.total || 0), 0);
          const tb = b.proformas.reduce((s, p) => s + parseFloat(p.total || 0), 0);
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
      {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-800 rounded-sm" />)}
    </div>
  );

  if (grupos.length === 0) return (
    <div className="flex items-center justify-center py-20">
      <EmptyState title="Sin proformas" icon={FileText}
        description="Las proformas aparecerán aquí una vez creadas desde la ficha de cliente" />
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Barra de filtros */}
        <div className="shrink-0 bg-slate-950/50 border-b border-slate-800 px-4 py-2 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar cliente o nº proforma..."
            className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 placeholder:text-slate-700 flex-1 min-w-0 max-w-xs"
          />
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 shrink-0"
          >
            <option value="todos">Estado: Todos</option>
            {ESTADOS_PROFORMA.map(e => <option key={e} value={e}>{e}</option>)}
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
            <EmptyState title="Sin coincidencias" icon={FileText} description="Ninguna proforma coincide con los filtros aplicados" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
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
                    {g.proformas.length} proforma{g.proformas.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Proformas del cliente */}
                {expandidos[g.cliente_id] && g.proformas.map(pf => (
                  <FilaProforma
                    key={pf.id}
                    pf={pf}
                    contrato={contratos.find(c => c.proforma_id === pf.id && c.estado !== 'obsoleto') || null}
                    busy={busy}
                    onAccion={accion}
                    onConfirmReabrir={setConfirmReabrir}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmReabrir && (
        <ConfirmReabrirModal
          proforma={confirmReabrir}
          onConfirm={() => {
            accion('crm-proforma-reabrir', { proforma_id: confirmReabrir.id }, `reabrir-${confirmReabrir.id}`);
            setConfirmReabrir(null);
          }}
          onClose={() => setConfirmReabrir(null)}
        />
      )}
    </>
  );
};

ProformasPanel.propTypes = {
  onAbrirCliente: PropTypes.func.isRequired,
  reloadKey:      PropTypes.number.isRequired,
};

export default ProformasPanel;
