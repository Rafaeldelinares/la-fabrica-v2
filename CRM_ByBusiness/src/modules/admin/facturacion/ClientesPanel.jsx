import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import ProformaModal from './ProformaModal';
import ProformaViewer from './ProformaViewer';
import { Users, ChevronDown, ChevronUp, CheckCircle, Clock, Plus, CreditCard, X, FileText, ExternalLink, MessageCircle, Mail, Receipt, RotateCcw, Pencil } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';
import { useAuth } from '../../auth/AuthContext';

/** Formatea un número como moneda EUR. */
const fmtEur = (v) => v != null ? `${parseFloat(v).toFixed(2)} €` : '—';

const METODOS = ['transferencia', 'efectivo', 'tarjeta', 'bizum'];

/**
 * PagoChip — Pastilla de pago individual dentro de un plan de pagos de proforma.
 * Muestra el estado (cobrado / pendiente) y permite registrar el cobro inline
 * seleccionando método y referencia de pago.
 * @param {object}   pg         - Objeto de pago con id, importe, estado, fecha y fracción
 * @param {Function} onCobrado  - Callback invocado tras registrar el cobro con éxito
 */
const PagoChip = ({ pg, onCobrado }) => {
  const [cobrandoId, setCobrandoId] = useState(null); // pago_id activo
  const [metodo, setMetodo]         = useState('transferencia');
  const [referencia, setReferencia] = useState('');
  const [saving, setSaving]         = useState(false);
  const base = import.meta.env.VITE_N8N_URL;

  const cobrar = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${base}/crm-cobro`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago_id: pg.id, metodo, referencia, fecha: new Date().toISOString().slice(0,10) }),
      });
      const d = await r.json();
      if (d.ok) { setCobrandoId(null); onCobrado && onCobrado(); }
    } catch { /* network error — state already reset */ } finally { setSaving(false); }
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
    id:     PropTypes.number.isRequired,
    estado: PropTypes.string,
    importe: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  onCobrado: PropTypes.func.isRequired,
}

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

/** Botón de acción con icono — muestra estado visual (idle/loading/done/error) y tooltip. */
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
}

/** Fila de proforma — muestra estado, acciones de envío y acceso al contrato digital. */
const ProformaRow = ({ proforma, cliente, contratos = [], onRefresh }) => {
  const [open, setOpen]             = useState(false);
  const [busy, setBusy]             = useState(null);
  const [verDoc, setVerDoc]         = useState(false);
  const n8nUrl = import.meta.env.VITE_N8N_URL;

  const contrato      = contratos.find(c => c.proforma_id === proforma.id && c.estado !== 'obsoleto') || null;
  const waEstado      = contrato?.whatsapp_estado || 'pendiente';
  const emEstado      = contrato?.email_estado    || 'pendiente';

  const showPencil    = proforma.estado === 'borrador';
  const showCheck     = true;
  const showFileText  = proforma.estado !== 'borrador';
  const showMsgWa     = proforma.estado !== 'borrador' && proforma.estado !== 'verificada';
  const showMail      = proforma.estado !== 'borrador' && proforma.estado !== 'verificada';
  const showFacturar  = proforma.estado === 'aceptada' && proforma.requiere_factura;
  const showReabrir   = proforma.estado !== 'borrador' && proforma.estado !== 'aceptada';

  const accion = async (endpoint, body, key) => {
    setBusy(key);
    try {
      const r = await fetch(`${n8nUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok || d.id || d.contrato_id) onRefresh();
    } catch { /* network error — state already reset */ } finally { setBusy(null); }
  };

  const pagos = proforma.pagos || [];

  return (
    <>
    {verDoc && (
      <ProformaViewer
        proforma={proforma}
        cliente={cliente}
        onClose={() => setVerDoc(false)}
      />
    )}
    <div className="border border-slate-800 rounded-sm">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-800/30 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-500 w-24 shrink-0 text-left">{proforma.numero || `PRO-${proforma.id}`}</span>
          <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${ESTADO_BADGE[proforma.estado] || 'bg-slate-700 text-slate-400'}`}>
            {proforma.estado}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Action Icons portados de ProformasSection */}
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            {showPencil && (
              <ActionIcon icon={Pencil} estado="pendiente" title="Editar" onClick={() => {}} />
            )}
            {showCheck && (
              <ActionIcon icon={CheckCircle} estado={proforma.verificada_admin ? 'activo' : 'pendiente'}
                title={proforma.verificada_admin ? 'Verificada' : 'Verificar'}
                onClick={() => accion('crm-proforma-verificar', { proforma_id: proforma.id }, `verif-${proforma.id}`)}
                disabled={busy === `verif-${proforma.id}`} />
            )}
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

          <span className="font-mono font-bold text-white ml-2">{fmtEur(proforma.total)}</span>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-3">
          {Array.isArray(proforma.lineas) && proforma.lineas.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1.5">Productos</p>
              {proforma.lineas.map((l, i) => (
                <div key={i} className="flex justify-between text-[11px] py-1 border-b border-slate-800/50 last:border-0">
                  <span className="text-slate-300">{l.descripcion || l.producto_nombre}</span>
                  <span className="font-mono text-slate-400">{l.cantidad}× {fmtEur(l.precio_unitario)} = <span className="text-white">{fmtEur(l.subtotal)}</span></span>
                </div>
              ))}
            </div>
          )}
          {pagos.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1.5">
                Plan de pagos
                <span className="ml-2 text-emerald-600">
                  {fmtEur(pagos.filter(p => p.estado === 'cobrado').reduce((s,p) => s + parseFloat(p.importe||0), 0))} cobrado
                </span>
                <span className="ml-2 text-amber-600">
                  {fmtEur(pagos.filter(p => p.estado === 'pendiente').reduce((s,p) => s + parseFloat(p.importe||0), 0))} pendiente
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {pagos.map((pg, i) => (
                  <PagoChip key={pg.id || i} pg={pg} onCobrado={onRefresh} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

ProformaRow.propTypes = {
  proforma: PropTypes.shape({
    id:               PropTypes.number.isRequired,
    numero:           PropTypes.string,
    estado:           PropTypes.string,
    total:            PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    lineas:           PropTypes.arrayOf(PropTypes.shape({
      descripcion:     PropTypes.string,
      producto_nombre: PropTypes.string,
      cantidad:        PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      precio_unitario: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      subtotal:        PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    })),
    pagos:            PropTypes.arrayOf(PropTypes.shape({
      id:              PropTypes.number,
      importe:         PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      estado:          PropTypes.string,
      fecha:           PropTypes.string,
      fraccion_num:    PropTypes.number,
      total_fracciones: PropTypes.number,
    })),
    verificada_admin: PropTypes.bool,
    requiere_factura: PropTypes.bool,
  }).isRequired,
  cliente: PropTypes.shape({
    id:              PropTypes.number.isRequired,
    nombre_comercial: PropTypes.string,
  }),
  contratos: PropTypes.arrayOf(PropTypes.shape({
    id:               PropTypes.number,
    proforma_id:      PropTypes.number,
    estado:           PropTypes.string,
    pdf_url:          PropTypes.string,
    whatsapp_estado:  PropTypes.string,
    email_estado:     PropTypes.string,
  })),
  onRefresh: PropTypes.func,
};

/**
 * ClienteRow — Fila expandible de cliente en el panel de facturación.
 * Muestra resumen económico (cobrado, pendiente, proformas) y carga las proformas
 * al expandirse. El nombre de empresa es clickeable y abre la ficha del cliente.
 * @param {object}   cliente          - Objeto cliente con totales y datos básicos
 * @param {Function} onNuevaProforma  - Callback invocado con el cliente para abrir ProformaModal
 * @param {Function} onAbrirCliente   - Callback para abrir ClienteDrawer con el cliente_id
 */
const ClienteRow = ({ cliente, onNuevaProforma, onAbrirCliente }) => {
  const [open, setOpen] = useState(false);
  const [proformas, setProformas] = useState(null);
  const [contratos, setContratos] = useState([]);
  const N8N_URL = import.meta.env.VITE_N8N_URL;

  const loadProformas = () => {
    Promise.all([
      fetch(`${N8N_URL}/crm-proformas?cliente_id=${cliente.id}`).then(r => r.json()),
      fetch(`${N8N_URL}/crm-71-get-contratos-digitales?cliente_id=${cliente.id}`).then(r => r.json()),
    ])
      .then(([dataProformas, dataContratos]) => {
        if (dataProformas.ok) setProformas(dataProformas.proformas);
        setContratos(Array.isArray(dataContratos) ? dataContratos : (dataContratos.contratos || []));
      })
      .catch(() => { setProformas([]); setContratos([]); });
  };

  const toggle = () => {
    if (!open) loadProformas();
    setOpen(o => !o);
  };

  return (
    <div className="border-b border-slate-800/50 last:border-0">
      <div onClick={toggle} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-800/20 transition-colors cursor-pointer">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <button
              onClick={e => { e.stopPropagation(); onAbrirCliente(cliente.id); }}
              className="group flex items-center gap-1 text-left"
            >
              <span className="font-bold text-slate-200 group-hover:text-blue-400 uppercase text-xs tracking-wide truncate transition-colors">{cliente.nombre_comercial}</span>
              <ExternalLink size={9} className="text-slate-700 group-hover:text-blue-400 transition-colors shrink-0" />
            </button>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">{cliente.localidad} · {cliente.operador_nombre || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Cobrado</p>
            <p className="text-xs font-mono font-bold text-emerald-400">{fmtEur(cliente.total_cobrado)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Pendiente</p>
            <p className="text-xs font-mono font-bold text-amber-400">{fmtEur(cliente.total_pendiente)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Proformas</p>
            <p className="text-xs font-mono text-slate-300">{cliente.num_proformas}</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onNuevaProforma(cliente); }}
            className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-[#D00000] border border-slate-700 hover:border-[#D00000]/50 px-2 py-1 rounded-sm transition-colors uppercase tracking-widest"
          >
            <Plus size={10} /> Proforma
          </button>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {proformas === null ? (
            <div className="animate-pulse h-10 bg-slate-800 rounded-sm" />
          ) : proformas.length === 0 ? (
            <p className="text-[10px] text-slate-700 italic font-mono uppercase tracking-widest py-2">Sin proformas</p>
          ) : proformas.map(p => <ProformaRow key={p.id} proforma={p} cliente={cliente} contratos={contratos} onRefresh={loadProformas} />)}
        </div>
      )}
    </div>
  );
};

ClienteRow.propTypes = {
  cliente: PropTypes.shape({
    id:               PropTypes.number.isRequired,
    nombre_comercial: PropTypes.string,
    localidad:        PropTypes.string,
    operador_nombre:  PropTypes.string,
    total_cobrado:    PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    total_pendiente:  PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    num_proformas:    PropTypes.number,
  }).isRequired,
  onNuevaProforma: PropTypes.func.isRequired,
  onAbrirCliente:  PropTypes.func.isRequired,
};

/**
 * ClientesPanel — Panel de facturación que lista clientes con sus proformas y pagos.
 * Orquesta la carga de clientes vía n8n y abre el ProformaModal para crear nuevas proformas.
 * @param {Function} onAbrirCliente - Callback para abrir la ficha del cliente en ClienteDrawer
 */
const ClientesPanel = ({ onAbrirCliente, alturaDisponible, reloadKey }) => {
  const { user } = useAuth();
  const [clientes, setClientes] = useState(null);
  const [modalCliente, setModalCliente] = useState(null);
  const [pagina, setPagina] = useState(1);
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
    loadClientes();
  // loadClientes cierra sobre N8N_URL que es constante de build, no reactiva
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

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
            {(() => {
              const totalPaginas = Math.ceil(clientes.length / filasPorPagina);
              const paginados = clientes.slice((pagina - 1) * filasPorPagina, pagina * filasPorPagina);
              return (
                <>
                  <div className="flex-1 overflow-y-auto">{paginados.map(c => <ClienteRow key={c.id} cliente={c} onNuevaProforma={setModalCliente} onAbrirCliente={onAbrirCliente} />)}</div>
                  {totalPaginas > 1 && (
                    <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-950/40">
                      <span className="text-[10px] text-slate-600 font-mono">
                        {(pagina - 1) * filasPorPagina + 1}–{Math.min(pagina * filasPorPagina, clientes.length)} de {clientes.length}
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
      </Card>

      {modalCliente && (
        <ProformaModal
          cliente={modalCliente}
          operadorId={user?.id}
          onClose={() => setModalCliente(null)}
          onCreated={loadClientes}
        />
      )}
    </>
  );
};

ClientesPanel.propTypes = {
  onAbrirCliente:   PropTypes.func.isRequired,
  alturaDisponible: PropTypes.number.isRequired,
  reloadKey:        PropTypes.number.isRequired,
};

export default ClientesPanel;
