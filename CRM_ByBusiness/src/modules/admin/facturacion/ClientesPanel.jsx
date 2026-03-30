import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import ProformaViewer from './ProformaViewer';
import {
  Users, ChevronDown, ChevronUp, CheckCircle, Clock, CreditCard, X,
  FileText, ExternalLink, MessageCircle, Mail, Receipt, RotateCcw, Pencil,
} from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';


/** Formatea un número como moneda EUR. */
const fmtEur = (v) => v != null ? `${parseFloat(v).toFixed(2)} €` : '—';

const METODOS = ['transferencia', 'efectivo', 'tarjeta', 'bizum'];

/** borrador→verificada→pendiente_cliente→aceptada|rechazada */
const ESTADO_BADGE_PROFORMA = {
  borrador:          'bg-slate-700 text-slate-300',
  verificada:        'bg-blue-900/50 text-blue-300',
  pendiente_cliente: 'bg-amber-900/50 text-amber-300',
  aceptada:          'bg-emerald-900/50 text-emerald-300',
  rechazada:         'bg-red-900/50 text-red-400',
};

const ESTADO_BADGE_FACTURA = {
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
  warning:   'text-amber-400 hover:text-amber-300',
  inactivo:  'text-slate-600 cursor-not-allowed',
};

/** Botón de acción con icono — muestra estado visual vía COLOR_CANAL. */
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
  estado:   PropTypes.oneOf(['pendiente', 'activo', 'inactivo', 'enviado', 'warning', 'aceptado', 'rechazado']),
  disabled: PropTypes.bool,
};

/**
 * PagoChip — Pastilla de pago individual dentro de un plan de pagos de proforma.
 * @param {object}   pg         - Objeto de pago con id, importe, estado, fecha y fracción
 * @param {Function} onCobrado  - Callback invocado tras registrar el cobro con éxito
 */
const PagoChip = ({ pg, onCobrado }) => {
  const [cobrandoId, setCobrandoId] = useState(null);
  const [metodo, setMetodo]         = useState('transferencia');
  const [referencia, setReferencia] = useState('');
  const [saving, setSaving]         = useState(false);
  const [errorMsg, setErrorMsg]     = useState(null);
  const base = import.meta.env.VITE_N8N_URL;

  const cobrar = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const r = await fetch(`${base}/crm-cobro`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago_id: pg.id, metodo, referencia, fecha: new Date().toISOString().slice(0,10) }),
      });
      const d = await r.json();
      if (d.ok) { setCobrandoId(null); onCobrado && onCobrado(); }
      else setErrorMsg('No se pudo registrar el cobro.');
    } catch (err) {
      setErrorMsg('Error de conexión. Intentá nuevamente.');
    } finally { setSaving(false); }
  };

  if (pg.estado === 'cobrado') {
    return (
      <div className="flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-800/30 rounded-sm px-2 py-1">
        <CheckCircle size={10} className="text-emerald-400" />
        <span className="text-[10px] font-mono text-slate-400">{pg.fraccion_num}/{pg.total_fracciones}</span>
        <span className="text-[10px] font-mono text-emerald-300 font-bold">{fmtEur(pg.importe)}</span>
        <span className="text-[10px] text-slate-600">{fmtFecha(pg.fecha)}</span>
      </div>
    );
  }

  if (cobrandoId === pg.id) {
    return (
      <div className="flex items-center gap-1.5 bg-slate-950 border border-[#D00000]/40 rounded-sm px-2 py-1.5 flex-wrap">
        <span className="text-[10px] font-mono text-white font-bold">{fmtEur(pg.importe)}</span>
        <select value={metodo} onChange={e => setMetodo(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-1.5 py-0.5 outline-none font-mono">
          {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={referencia} onChange={e => setReferencia(e.target.value)}
          placeholder="Ref." className="w-20 bg-slate-800 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-1.5 py-0.5 outline-none font-mono" />
        <button onClick={cobrar} disabled={saving}
          className="text-[10px] font-black text-white bg-emerald-700 hover:bg-emerald-600 px-2 py-0.5 rounded-sm transition-colors disabled:opacity-50">
          {saving ? '…' : '✓ Cobrar'}
        </button>
        <button onClick={() => setCobrandoId(null)} className="text-slate-600 hover:text-white transition-colors"><X size={10} /></button>
        {errorMsg && <span className="text-[9px] text-red-400 font-mono w-full">{errorMsg}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-sm px-2 py-1 group">
      <Clock size={10} className="text-amber-400" />
      <span className="text-[10px] font-mono text-slate-400">{pg.fraccion_num}/{pg.total_fracciones}</span>
      <span className="text-[10px] font-mono text-white font-bold">{fmtEur(pg.importe)}</span>
      <span className="text-[10px] text-slate-600">{fmtFecha(pg.fecha)}</span>
      <button onClick={() => setCobrandoId(pg.id)}
        className="hidden group-hover:flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-emerald-400 transition-colors ml-1">
        <CreditCard size={9} /> Cobrar
      </button>
    </div>
  );
};

PagoChip.propTypes = {
  pg: PropTypes.shape({
    id:               PropTypes.number.isRequired,
    estado:           PropTypes.string,
    importe:          PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    fraccion_num:     PropTypes.number,
    total_fracciones: PropTypes.number,
    fecha:            PropTypes.string,
  }).isRequired,
  onCobrado: PropTypes.func.isRequired,
};

/**
 * FilaProformaSimple — línea de proforma dentro de ClienteRow (sin expansión de líneas).
 * @param {object}   proforma   - Datos de la proforma
 * @param {object}   cliente    - Datos del cliente para acciones
 * @param {object}   contrato   - Contrato digital activo vinculado, si existe
 * @param {Function} onRefresh  - Callback para recargar datos del cliente
 */
const FilaProformaSimple = ({ proforma, cliente, contrato, onRefresh }) => {
  const [busy, setBusy]       = useState(null);
  const [verDoc, setVerDoc]   = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const n8nUrl = import.meta.env.VITE_N8N_URL;

  const waEstado = contrato?.whatsapp_estado || 'pendiente';
  const emEstado = contrato?.email_estado    || 'pendiente';
  const es       = proforma.estado;

  const showPencil   = es === 'borrador';
  const showFileText = es !== 'borrador';
  const showMsgWa    = es !== 'borrador' && es !== 'verificada';
  const showMail     = es !== 'borrador' && es !== 'verificada';
  const showFacturar = es === 'aceptada' && proforma.requiere_factura;
  const showReabrir  = es !== 'borrador' && es !== 'aceptada';

  const accion = async (endpoint, body, key) => {
    setBusy(key);
    setErrorMsg(null);
    try {
      const r = await fetch(`${n8nUrl}/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok || d.id || d.contrato_id) onRefresh();
      else setErrorMsg('La acción no se completó. Intentá nuevamente.');
    } catch (err) {
      setErrorMsg('Error de conexión. Intentá nuevamente.');
    } finally { setBusy(null); }
  };

  return (
    <>
      {verDoc && (
        <ProformaViewer proforma={proforma} cliente={cliente} onClose={() => setVerDoc(false)} />
      )}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
        <span className="text-xs font-mono text-slate-400 w-24 shrink-0">{proforma.numero || `PF-${proforma.id}`}</span>
        <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0 ${ESTADO_BADGE_PROFORMA[es] || 'bg-slate-700 text-slate-400'}`}>
          {es}
        </span>
        <span className="text-xs font-mono font-bold text-white ml-auto shrink-0">{fmtEur(proforma.total)}</span>
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          {/* Editar proforma: pendiente de implementar drawer de edición */}
          {showPencil && (
            <ActionIcon icon={Pencil} estado="inactivo" title="Editar proforma (próximamente)" onClick={null} disabled />
          )}
          <ActionIcon icon={CheckCircle} estado={proforma.verificada_admin ? 'activo' : 'pendiente'}
            title={proforma.verificada_admin ? 'Verificada' : 'Verificar'}
            onClick={() => accion('crm-proforma-verificar', { proforma_id: proforma.id }, `verif-${proforma.id}`)}
            disabled={busy === `verif-${proforma.id}`} />
          {showFileText && (
            <ActionIcon icon={FileText} estado={contrato ? 'activo' : 'pendiente'}
              title={contrato ? 'Ver contrato PDF' : 'Generar contrato'}
              onClick={() => contrato
                ? window.open(contrato.pdf_url, '_blank')
                : accion('crm-70-post-contrato-digital', {
                    cliente_id: cliente.id, proforma_id: proforma.id,
                    objeto: (proforma.lineas || []).map(l => l.descripcion).filter(Boolean).join(', ') || proforma.numero || 'Servicios',
                    importe_mensual: proforma.total || null, canal_envio: 'whatsapp',
                  }, `contrato-${proforma.id}`)
              }
              disabled={busy === `contrato-${proforma.id}`} />
          )}
          {showMsgWa && (
            <ActionIcon icon={MessageCircle} estado={!contrato ? 'inactivo' : waEstado}
              title={`WhatsApp: ${waEstado}`}
              onClick={() => contrato && accion('crm-72-post-contrato-enviar', { contrato_id: contrato.id }, `wa-${proforma.id}`)}
              disabled={!contrato || busy === `wa-${proforma.id}` || waEstado === 'aceptado'} />
          )}
          {showMail && (
            <ActionIcon icon={Mail} estado={!contrato ? 'inactivo' : emEstado}
              title={`Email: ${emEstado}`}
              onClick={() => contrato && accion('crm-75-post-contrato-email', { contrato_id: contrato.id }, `em-${proforma.id}`)}
              disabled={!contrato || busy === `em-${proforma.id}` || emEstado === 'aceptado'} />
          )}
          {showFacturar && (
            <ActionIcon icon={Receipt} estado="activo" title="Facturar"
              onClick={() => accion('crm-factura-generar', { proforma_id: proforma.id }, `factura-${proforma.id}`)}
              disabled={busy === `factura-${proforma.id}`} />
          )}
          {showReabrir && (
            <ActionIcon icon={RotateCcw} estado="warning" title="Reabrir"
              onClick={() => accion('crm-proforma-reabrir', { proforma_id: proforma.id }, `reabrir-${proforma.id}`)}
              disabled={busy === `reabrir-${proforma.id}`} />
          )}
        </div>
      </div>
      {errorMsg && <p className="text-[9px] text-red-400 font-mono px-4 pb-1">{errorMsg}</p>}
    </>
  );
};

FilaProformaSimple.propTypes = {
  proforma: PropTypes.shape({
    id:               PropTypes.number.isRequired,
    numero:           PropTypes.string,
    estado:           PropTypes.string,
    total:            PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    lineas:           PropTypes.array,
    verificada_admin: PropTypes.bool,
    requiere_factura: PropTypes.bool,
  }).isRequired,
  cliente:   PropTypes.shape({ id: PropTypes.number.isRequired }).isRequired,
  contrato:  PropTypes.object,
  onRefresh: PropTypes.func.isRequired,
};

/**
 * FilaFacturaSimple — línea de factura dentro de ClienteRow (sin expansión).
 * @param {object}   factura   - Datos de la factura
 * @param {Function} onRefresh - Callback para recargar datos del cliente
 */
const FilaFacturaSimple = ({ factura: f, onRefresh }) => {
  const [busy, setBusy]         = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const n8nUrl = import.meta.env.VITE_N8N_URL;

  const accion = async (endpoint, body, key) => {
    setBusy(key);
    setErrorMsg(null);
    try {
      const r = await fetch(`${n8nUrl}/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok || d.id || d.factura_id) onRefresh();
      else setErrorMsg('La acción no se completó. Intentá nuevamente.');
    } catch (err) {
      setErrorMsg('Error de conexión. Intentá nuevamente.');
    } finally { setBusy(null); }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
      <span className="text-xs font-mono font-bold text-white w-28 shrink-0">{f.numero}</span>
      <span className="text-xs font-mono text-slate-500 w-20 shrink-0">{fmtFecha(f.fecha_emision)}</span>
      <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0 ${ESTADO_BADGE_FACTURA[f.estado] || ESTADO_BADGE_FACTURA.emitida}`}>
        {f.estado}
      </span>
      <span className="text-xs font-mono font-bold text-white ml-auto shrink-0">{fmtEur(f.total_con_iva)}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        <ActionIcon icon={FileText} estado={f.pdf_url ? 'activo' : 'pendiente'}
          title={f.pdf_url ? 'Ver Factura PDF' : 'Generar PDF'}
          onClick={() => f.pdf_url
            ? window.open(f.pdf_url, '_blank')
            : accion('crm-factura-generar-pdf', { factura_id: f.id }, `pdf-${f.id}`)
          }
          disabled={busy === `pdf-${f.id}`} />
        <ActionIcon icon={MessageCircle}
          estado={!f.pdf_url ? 'inactivo' : (f.whatsapp_estado || 'pendiente')}
          title={!f.pdf_url ? 'Genera el PDF primero' : `WhatsApp: ${f.whatsapp_estado || 'pendiente'}`}
          onClick={() => f.pdf_url && accion('crm-factura-enviar-wa', { factura_id: f.id }, `wa-${f.id}`)}
          disabled={!f.pdf_url || busy === `wa-${f.id}`} />
        <ActionIcon icon={Mail}
          estado={!f.pdf_url ? 'inactivo' : (f.email_estado || 'pendiente')}
          title={!f.pdf_url ? 'Genera el PDF primero' : `Email: ${f.email_estado || 'pendiente'}`}
          onClick={() => f.pdf_url && accion('crm-factura-enviar-email', { factura_id: f.id }, `em-${f.id}`)}
          disabled={!f.pdf_url || busy === `em-${f.id}`} />
      </div>
      {errorMsg && <p className="text-[9px] text-red-400 font-mono px-4 pb-1">{errorMsg}</p>}
    </div>
  );
};

FilaFacturaSimple.propTypes = {
  factura: PropTypes.shape({
    id:              PropTypes.number.isRequired,
    numero:          PropTypes.string,
    estado:          PropTypes.string,
    fecha_emision:   PropTypes.string,
    total_con_iva:   PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    pdf_url:         PropTypes.string,
    whatsapp_estado: PropTypes.string,
    email_estado:    PropTypes.string,
  }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

/**
 * ClienteExpandido — contenido lazy del cliente expandido.
 * Carga en paralelo proformas, contratos y facturas al montarse.
 * @param {object}   cliente   - Objeto cliente con id y nombre_comercial
 * @param {Function} onRefresh - Callback para invalidar la lista de clientes
 */
const ClienteExpandido = ({ cliente, onRefresh }) => {
  const [proformas,  setProformas]  = useState(null);
  const [contratos,  setContratos]  = useState([]);
  const [facturas,   setFacturas]   = useState(null);
  const N8N_URL = import.meta.env.VITE_N8N_URL;

  useEffect(() => {
    Promise.all([
      fetch(`${N8N_URL}/crm-proformas?cliente_id=${cliente.id}`).then(r => r.json()),
      fetch(`${N8N_URL}/crm-71-get-contratos-digitales?cliente_id=${cliente.id}`).then(r => r.json()).catch(() => ({})),
      fetch(`${N8N_URL}/crm-facturas-get?cliente_id=${cliente.id}`).then(r => r.json()).catch(() => ({})),
    ])
      .then(([dp, dc, df]) => {
        setProformas(dp.ok ? (dp.proformas || []) : []);
        setContratos(Array.isArray(dc) ? dc : (dc.contratos || []));
        setFacturas(df.facturas || []);
      })
      .catch(() => { setProformas([]); setContratos([]); setFacturas([]); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  const Skeleton = () => (
    <div className="flex flex-col gap-2 py-2 animate-pulse">
      <div className="h-6 bg-slate-800 rounded-sm" />
      <div className="h-6 bg-slate-800 rounded-sm w-4/5" />
    </div>
  );

  return (
    <div className="px-4 pb-3 space-y-3">
      {/* Sub-sección Proformas */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-slate-600">Proformas</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>
        {proformas === null ? <Skeleton /> : proformas.length === 0 ? (
          <p className="text-[10px] text-slate-700 italic font-mono py-1">Sin proformas</p>
        ) : proformas.map(p => (
          <FilaProformaSimple
            key={p.id}
            proforma={p}
            cliente={cliente}
            contrato={contratos.find(c => c.proforma_id === p.id && c.estado !== 'obsoleto') || null}
            onRefresh={onRefresh}
          />
        ))}
      </div>

      {/* Sub-sección Facturas */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-slate-600">Facturas</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>
        {facturas === null ? <Skeleton /> : facturas.length === 0 ? (
          <p className="text-[10px] text-slate-700 italic font-mono py-1">Sin facturas</p>
        ) : facturas.map(f => (
          <FilaFacturaSimple key={f.id} factura={f} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
};

ClienteExpandido.propTypes = {
  cliente:   PropTypes.shape({ id: PropTypes.number.isRequired, nombre_comercial: PropTypes.string }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

/**
 * ClienteRow — Fila expandible de cliente en el panel de facturación.
 * Muestra resumen económico (cobrado, pendiente, proformas, facturas) y carga
 * datos al expandirse. El nombre de empresa es clickeable y abre la ficha del cliente.
 * @param {object}   cliente         - Objeto cliente con totales y datos básicos
 * @param {Function} onAbrirCliente  - Callback para abrir ClienteDrawer con el cliente_id
 * @param {Function} onRefreshParent - Callback para recargar la lista de clientes
 */
const ClienteRow = ({ cliente, onAbrirCliente, onRefreshParent }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-800/50 last:border-0">
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-800/20 transition-colors cursor-pointer"
      >
        {/* Info principal */}
        <div className="min-w-0 flex-1">
          <button
            onClick={e => { e.stopPropagation(); onAbrirCliente(cliente.id); }}
            className="group flex items-center gap-1 text-left"
          >
            <span className="font-bold text-slate-200 group-hover:text-blue-400 uppercase text-xs tracking-wide truncate transition-colors">
              {cliente.nombre_comercial}
            </span>
            <ExternalLink size={9} className="text-slate-700 group-hover:text-blue-400 transition-colors shrink-0" />
          </button>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{cliente.localidad}</p>
          {cliente.operador_nombre && (
            <p className="text-[10px] text-slate-600 font-mono">· {cliente.operador_nombre}</p>
          )}
        </div>

        {/* Stats en 4 columnas — sin etiquetas, la cabecera las pone una sola vez */}
        <div className="flex items-center gap-4 shrink-0">
          <p className="text-xs font-mono font-bold text-emerald-400 w-20 text-right">{fmtEur(cliente.total_cobrado)}</p>
          <p className="text-xs font-mono font-bold text-amber-400 w-20 text-right">{fmtEur(cliente.total_pendiente)}</p>
          <p className="text-xs font-mono font-bold text-slate-300 w-8 text-right">{cliente.num_proformas_aceptadas ?? cliente.num_proformas ?? 0}</p>
          <p className="text-xs font-mono font-bold text-slate-300 w-8 text-right">{cliente.num_facturas ?? 0}</p>
          {open
            ? <ChevronUp size={14} className="text-slate-500 ml-1" />
            : <ChevronDown size={14} className="text-slate-500 ml-1" />}
        </div>
      </div>

      {open && <ClienteExpandido cliente={cliente} onRefresh={onRefreshParent} />}
    </div>
  );
};

ClienteRow.propTypes = {
  cliente: PropTypes.shape({
    id:                      PropTypes.number.isRequired,
    nombre_comercial:        PropTypes.string,
    localidad:               PropTypes.string,
    operador_nombre:         PropTypes.string,
    total_cobrado:           PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    total_pendiente:         PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    num_proformas:           PropTypes.number,
    num_proformas_aceptadas: PropTypes.number,
    num_facturas:            PropTypes.number,
  }).isRequired,
  onAbrirCliente:  PropTypes.func.isRequired,
  onRefreshParent: PropTypes.func.isRequired,
};

const ORDEN_OPCIONES = [
  { value: 'nombre_asc',     label: 'Nombre A→Z' },
  { value: 'nombre_desc',    label: 'Nombre Z→A' },
  { value: 'cobrado_desc',   label: 'Cobrado ↓' },
  { value: 'pendiente_desc', label: 'Pendiente ↓' },
];

/**
 * ClientesPanel — Panel de facturación que lista clientes con sus proformas y facturas.
 * Orquesta la carga de clientes vía n8n y permite filtrar y ordenar inline.
 * @param {Function} onAbrirCliente   - Callback para abrir la ficha del cliente en ClienteDrawer
 * @param {number}   alturaDisponible - Altura en px disponible para calcular filas por página
 * @param {number}   reloadKey        - Incrementar para forzar recarga y resetear filtros
 */
const ClientesPanel = ({ onAbrirCliente, alturaDisponible, reloadKey }) => {

  const [clientes,    setClientes]    = useState(null);
  const [pagina,      setPagina]      = useState(1);
  const [busqueda,    setBusqueda]    = useState('');
  const [orden,       setOrden]       = useState('nombre_asc');
  const N8N_URL = import.meta.env.VITE_N8N_URL;

  const filasPorPagina = Math.max(5, Math.floor((alturaDisponible - 40) / 52));

  useEffect(() => { setPagina(1); }, [filasPorPagina]);

  /** Carga la lista de clientes desde el servidor. */
  const loadClientes = () => {
    fetch(`${N8N_URL}/crm-clientes`)
      .then(r => r.json())
      .then(d => { if (d.ok) { setClientes(d.clientes); setPagina(1); } })
      .catch(() => setClientes([]));
  };

  useEffect(() => {
    setBusqueda('');
    setOrden('nombre_asc');
    loadClientes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const clientesFiltrados = useMemo(() => {
    if (!clientes) return [];
    let lista = clientes.filter(c =>
      (c.nombre_comercial || '').toLowerCase().includes(busqueda.toLowerCase())
    );
    switch (orden) {
      case 'nombre_asc':
        lista = [...lista].sort((a, b) => (a.nombre_comercial || '').localeCompare(b.nombre_comercial || ''));
        break;
      case 'nombre_desc':
        lista = [...lista].sort((a, b) => (b.nombre_comercial || '').localeCompare(a.nombre_comercial || ''));
        break;
      case 'cobrado_desc':
        lista = [...lista].sort((a, b) => parseFloat(b.total_cobrado || 0) - parseFloat(a.total_cobrado || 0));
        break;
      case 'pendiente_desc':
        lista = [...lista].sort((a, b) => parseFloat(b.total_pendiente || 0) - parseFloat(a.total_pendiente || 0));
        break;
      default:
        break;
    }
    return lista;
  }, [clientes, busqueda, orden]);

  return (
    <>
      <Card className="flex flex-col h-full bg-slate-900 border-slate-800 !p-0 overflow-hidden">
        {clientes === null ? (
          <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
            <div className="flex flex-col gap-3 items-center">
              <div className="h-4 w-48 bg-slate-800 rounded-sm" />
              <div className="h-3 w-32 bg-slate-800 rounded-sm" />
            </div>
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <EmptyState title="Sin clientes" icon={Users} description="Los clientes aparecerán aquí cuando se cierren ventas" />
          </div>
        ) : (
          <>
            {/* Barra superior */}
            <div className="shrink-0 bg-slate-950/50 border-b border-slate-800 px-4 py-2 flex items-center gap-3">
              <input
                type="text"
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                placeholder="🔍 Buscar por nombre..."
                className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 placeholder:text-slate-700 flex-1 min-w-0 max-w-xs"
              />
              <select
                value={orden}
                onChange={e => { setOrden(e.target.value); setPagina(1); }}
                className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 shrink-0"
              >
                {ORDEN_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {busqueda && (
                <span className="text-[10px] font-mono text-slate-600 shrink-0">
                  {clientesFiltrados.length} resultado{clientesFiltrados.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {clientesFiltrados.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <EmptyState title="Sin coincidencias" icon={Users} description="Ningún cliente coincide con la búsqueda" />
              </div>
            ) : (
              <>
                {(() => {
                  const totalPaginas = Math.ceil(clientesFiltrados.length / filasPorPagina);
                  const paginados = clientesFiltrados.slice((pagina - 1) * filasPorPagina, pagina * filasPorPagina);
                  return (
                    <>
                      {/* Cabecera de columnas — una sola vez */}
                      <div className="shrink-0 flex items-center justify-between px-4 py-1.5 border-b border-slate-800 bg-slate-950/60">
                        <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">Cliente</span>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono w-20 text-right">Cobr.</span>
                          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono w-20 text-right">Pend.</span>
                          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono w-8 text-right">Acept.</span>
                          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono w-8 text-right">Fact.</span>
                          <span className="w-[22px]" />{/* espacio chevron */}
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {paginados.map(c => (
                          <ClienteRow
                            key={c.id}
                            cliente={c}
                            onAbrirCliente={onAbrirCliente}
                            onRefreshParent={loadClientes}
                          />
                        ))}
                      </div>
                      {totalPaginas > 1 && (
                        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-950/40">
                          <span className="text-[10px] text-slate-600 font-mono">
                            {(pagina - 1) * filasPorPagina + 1}–{Math.min(pagina * filasPorPagina, clientesFiltrados.length)} de {clientesFiltrados.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPagina(p => Math.max(1, p - 1))}
                              disabled={pagina === 1}
                              className="px-2 py-1 text-[10px] font-mono border border-slate-700 rounded-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >‹</button>
                            <span className="text-[10px] font-mono text-slate-500 px-2">{pagina}/{totalPaginas}</span>
                            <button
                              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                              disabled={pagina === totalPaginas}
                              className="px-2 py-1 text-[10px] font-mono border border-slate-700 rounded-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >›</button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}
      </Card>

      {/* ProformaModal: pendiente de trigger desde ClienteRow */}
    </>
  );
};

ClientesPanel.propTypes = {
  onAbrirCliente:   PropTypes.func.isRequired,
  alturaDisponible: PropTypes.number.isRequired,
  reloadKey:        PropTypes.number.isRequired,
};

export default ClientesPanel;
