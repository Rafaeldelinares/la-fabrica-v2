import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Plus, ChevronDown, ChevronRight, Trash2,
  CheckCircle, FileText, MessageCircle, Mail, Eye, RotateCcw, Pencil, X, Receipt,
} from 'lucide-react';
import ModalNuevaProforma from './ModalNuevaProforma';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

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

/**
 * ActionIcon — botón de icono con estado de color.
 * @param {{ icon: React.ElementType, estado: string, onClick: Function, disabled: boolean, title: string }} props
 */
function ActionIcon({ icon: Icon, estado, onClick, disabled, title }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`p-1 transition-colors rounded-sm ${COLOR_CANAL[estado] ?? COLOR_CANAL.pendiente}`}
    >
      <Icon size={16} />
    </button>
  );
}

ActionIcon.propTypes = {
  icon:     PropTypes.elementType.isRequired,
  estado:   PropTypes.string.isRequired,
  onClick:  PropTypes.func,
  disabled: PropTypes.bool,
  title:    PropTypes.string,
};

/**
 * EvidenciaModal — muestra respuesta del canal firmado.
 * @param {{ contrato: object, onClose: Function }} props
 */
function EvidenciaModal({ contrato, onClose }) {
  const canal = contrato.email_estado === 'aceptado' || contrato.email_estado === 'rechazado'
    ? 'Email' : 'WhatsApp';
  const respuesta = contrato.email_estado === 'aceptado' || contrato.email_estado === 'rechazado'
    ? contrato.email_estado : contrato.whatsapp_estado;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-80 flex flex-col gap-3"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Evidencia de firma</p>
        <div className="flex flex-col gap-1 text-xs font-mono">
          <span className="text-slate-500">Canal: <span className="text-slate-200">{canal}</span></span>
          <span className="text-slate-500">Respuesta: <span className={respuesta === 'aceptado' ? 'text-emerald-400' : 'text-red-400'}>{respuesta}</span></span>
          {contrato.respuesta_raw && (
            <span className="text-slate-500 mt-1 break-all">Detalle: <span className="text-slate-300">{contrato.respuesta_raw}</span></span>
          )}
        </div>
        <button onClick={onClose} className="mt-2 text-[10px] font-mono uppercase text-slate-500 hover:text-slate-300 transition-colors">Cerrar</button>
      </div>
    </div>
  );
}

EvidenciaModal.propTypes = {
  contrato: PropTypes.object.isRequired,
  onClose:  PropTypes.func.isRequired,
};

/**
 * ContratoModal — Popup con detalles del contrato digital.
 * @param {{ contrato: object, onClose: Function }} props
 */
function ContratoModal({ contrato, onClose }) {
  const LABEL = 'text-[10px] text-slate-500 uppercase tracking-widest font-mono';
  const VAL   = 'text-xs text-white font-mono';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-950 border border-slate-700 rounded-sm shadow-2xl p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <p className="text-xs font-black uppercase tracking-widest text-white font-mono">
            Contrato {contrato.referencia}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className={LABEL}>Objeto</p>
            <p className={`${VAL} text-slate-300 text-[11px] leading-relaxed`}>{contrato.objeto}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={LABEL}>Importe</p>
              <p className={VAL}>{contrato.importe_mensual ? `${(+contrato.importe_mensual).toFixed(2)}€` : '—'}</p>
            </div>
            <div>
              <p className={LABEL}>Estado</p>
              <p className={VAL}>{contrato.estado}</p>
            </div>
            <div>
              <p className={LABEL}>Canal</p>
              <p className={VAL}>{contrato.canal_envio || '—'}</p>
            </div>
            <div>
              <p className={LABEL}>Creado</p>
              <p className={VAL}>{contrato.created_at ? new Date(contrato.created_at).toLocaleDateString('es-ES') : '—'}</p>
            </div>
          </div>
        </div>

        {contrato.pdf_url ? (
          <a
            href={contrato.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-mono uppercase tracking-widest bg-[#D00000] hover:bg-red-800 text-white rounded-sm px-4 py-2 text-center transition-colors"
          >
            Ver PDF
          </a>
        ) : (
          <p className="text-[10px] text-slate-500 font-mono text-center">PDF no disponible aún</p>
        )}
      </div>
    </div>
  );
}
ContratoModal.propTypes = {
  contrato: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

/* ─── componente principal ────────────────────────────────────────────────── */

/**
 * ProformasSection — Lista de proformas con máquina de estados:
 * borrador → verificada → pendiente_cliente → aceptada | rechazada
 * @param {{ cliente: object, n8nUrl: string, operadorId: string|number }} props
 */
const ProformasSection = ({ cliente, n8nUrl, operadorId }) => {
  const [proformas, setProformas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [expanded,  setExpanded]  = useState({});
  const [showModal,    setShowModal]    = useState(false);
  const [editProforma, setEditProforma] = useState(null);
  const [busy,         setBusy]         = useState(null);
  const [evidencia,     setEvidencia]     = useState(null);
  const [contratoVista, setContratoVista] = useState(null);
  const [confirmReabrir, setConfirmReabrir] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([
      fetch(`${n8nUrl}/crm-proformas?cliente_id=${cliente.id}`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch(`${n8nUrl}/crm-71-get-contratos-digitales?cliente_id=${cliente.id}`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
    ])
      .then(([dp, dc]) => {
        setProformas(dp.proformas || []);
        setContratos(Array.isArray(dc) ? dc : (dc.contratos || []));
        setLoading(false);
      })
      .catch(() => { setError('Error al cargar datos'); setLoading(false); });
  }, [cliente.id, n8nUrl]);

  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (endpoint, body, key) => {
    setBusy(key);
    try {
      const r = await fetch(`${n8nUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`HTTP ${r.status}: ${text || 'Error del servidor'}`);
      }
      const d = await r.json();
      if (d.ok) cargar();
      else setError(d.message || d.error || `Error en ${endpoint}`);
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith('HTTP') ? 'Error de conexión al ejecutar la acción' : 'Error al ejecutar la acción');
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  if (loading) return <p className="text-[10px] text-slate-500 font-mono px-5 py-4 animate-pulse">Cargando proformas…</p>;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        {error && <p className="text-[10px] text-red-400 font-mono mr-auto">{error}</p>}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest border border-[#D00000]/40 hover:border-[#D00000] text-[#D00000] rounded-sm px-3 py-1.5 transition-colors ml-auto"
        >
          <Plus size={10} /> Nueva proforma
        </button>
      </div>

      {!proformas.length && <p className="text-xs text-slate-500 font-mono px-5 py-6">No hay proformas registradas.</p>}

      {proformas.map(pf => {
        const contrato      = contratos.find(c => c.proforma_id === pf.id && c.estado !== 'obsoleto') || null;
        const waEstado      = contrato?.whatsapp_estado || 'pendiente';
        const emEstado      = contrato?.email_estado    || 'pendiente';
        const tieneRespuesta = ['aceptado','rechazado'].includes(waEstado) || ['aceptado','rechazado'].includes(emEstado);
        const es            = pf.estado;

        /* ── visibilidad por estado ── */
        const showPencil    = es === 'borrador';
        const showCheck     = true; // Siempre mostrar para ver estado de verificación
        const showFileText  = es !== 'borrador'; 
        const showMsgWa     = es !== 'borrador' && es !== 'verificada';
        const showMail      = es !== 'borrador' && es !== 'verificada';
        const showEye       = es === 'aceptada' || tieneRespuesta;
        const showFacturar  = es === 'aceptada' && pf.requiere_factura;
        const showReabrir   = es !== 'borrador' && es !== 'aceptada';
        const showIcons     = true;

        /* FileText: disabled solo si no hay contrato y no se puede generar (pendiente_cliente sin contrato) */
        const fileTextDisabled = (!contrato && es === 'pendiente_cliente') || busy === `contrato-${pf.id}`;

        return (
          <div key={pf.id} className="border-b border-slate-800">
            {/* fila principal */}
            <div
              className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-900/40 transition-colors"
              onClick={() => toggle(pf.id)}
            >
              {expanded[pf.id]
                ? <ChevronDown  size={12} className="text-slate-500 shrink-0" />
                : <ChevronRight size={12} className="text-slate-500 shrink-0" />}

              <span className="text-xs font-mono text-slate-400 w-32 shrink-0">{pf.numero || `PF-${pf.id}`}</span>

              <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${ESTADO_BADGE[es] || 'bg-slate-700 text-slate-400'}`}>
                {es}
              </span>

              <span className="text-xs font-mono text-slate-300 ml-auto">
                {Number(pf.total || 0).toFixed(2)}€
                {pf.iva_pct != null && (
                  <span className="text-[9px] font-mono text-amber-500 ml-1">+IVA {pf.iva_pct}%</span>
                )}
              </span>

              {/* ── action icons — visibilidad según máquina de estados ── */}
              {showIcons && (
                <div className="flex items-center gap-0.5 ml-2 shrink-0" onClick={e => e.stopPropagation()}>

                  {showPencil && (
                    <ActionIcon icon={Pencil} estado="pendiente"
                      title="Editar proforma"
                      onClick={() => setEditProforma(pf)}
                      disabled={false} />
                  )}
                  {showCheck && (
                    <ActionIcon icon={CheckCircle} estado={pf.verificada_admin ? 'activo' : 'pendiente'}
                      title={pf.verificada_admin ? 'Verificada por admin' : 'Verificar proforma'}
                      onClick={() => accion('crm-proforma-verificar', { proforma_id: pf.id }, `verif-${pf.id}`)}
                      disabled={busy === `verif-${pf.id}`} />
                  )}
                  {showFileText && (
                    <ActionIcon icon={FileText} estado={contrato ? 'activo' : 'pendiente'}
                      title={fileTextDisabled && es === 'pendiente_cliente' ? 'Contrato ya creado' : contrato ? 'Ver contrato PDF' : 'Generar contrato digital'}
                      onClick={() => !fileTextDisabled && (contrato
                        ? setContratoVista(contrato)
                        : accion('crm-70-post-contrato-digital', {
                            cliente_id: cliente.id, proforma_id: pf.id,
                            objeto: (pf.lineas || []).map(l => l.descripcion).filter(Boolean).join(', ') || pf.numero || 'Servicios contratados',
                            importe_mensual: pf.total || null, canal_envio: 'whatsapp',
                          }, `contrato-${pf.id}`)
                      )}
                      disabled={fileTextDisabled} />
                  )}
                  {showMsgWa && (
                    <ActionIcon icon={MessageCircle} estado={!contrato ? 'inactivo' : waEstado}
                      title={!contrato ? 'Genera el contrato primero' : `WhatsApp: ${waEstado}`}
                      onClick={() => contrato && accion('crm-72-post-contrato-enviar', { contrato_id: contrato.id }, `wa-${pf.id}`)}
                      disabled={!contrato || busy === `wa-${pf.id}` || waEstado === 'aceptado'} />
                  )}
                  {showMail && (
                    <ActionIcon icon={Mail} estado={!contrato ? 'inactivo' : emEstado}
                      title={!contrato ? 'Genera el contrato primero' : `Email: ${emEstado}`}
                      onClick={() => contrato && accion('crm-75-post-contrato-email', { contrato_id: contrato.id }, `em-${pf.id}`)}
                      disabled={!contrato || busy === `em-${pf.id}` || emEstado === 'aceptado'} />
                  )}
                  {showEye && (
                    <ActionIcon icon={Eye} estado={tieneRespuesta ? 'activo' : 'inactivo'}
                      title={tieneRespuesta ? 'Ver evidencia de respuesta' : 'Sin respuesta aún'}
                      onClick={() => tieneRespuesta && setEvidencia(contrato)}
                      disabled={!tieneRespuesta} />
                  )}
                  {showFacturar && (
                    <ActionIcon icon={Receipt} estado="activo"
                      title="Generar factura"
                      onClick={() => accion('crm-factura-generar', { proforma_id: pf.id }, `factura-${pf.id}`)}
                      disabled={busy === `factura-${pf.id}`} />
                  )}
                  {showReabrir && (
                    <ActionIcon icon={RotateCcw} estado="warning" title="Reabrir proforma"
                      onClick={() => setConfirmReabrir(pf)}
                      disabled={busy === `reabrir-${pf.id}`} />
                  )}
                </div>
              )}
            </div>

            {/* detalle expandido */}
            {expanded[pf.id] && (
              <div className="px-8 pb-4 flex flex-col gap-3">
                {(pf.lineas || []).length > 0 && (
                  <table className="w-full text-[10px] font-mono text-slate-400">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left pb-1 font-normal text-slate-500">Descripción</th>
                        <th className="text-right pb-1 pl-3 font-normal text-slate-500">Cant.</th>
                        <th className="text-right pb-1 pl-3 font-normal text-slate-500">Precio</th>
                        <th className="text-right pb-1 pl-3 font-normal text-slate-500">Dto%</th>
                        <th className="text-right pb-1 pl-3 font-normal text-slate-500">Subtotal</th>
                        {es === 'borrador' && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {(pf.lineas || []).map(l => (
                        <tr key={l.id} className="border-b border-slate-900">
                          <td className="py-1 text-slate-300">{l.descripcion}</td>
                          <td className="py-1 pl-3 text-right">{l.cantidad}</td>
                          <td className="py-1 pl-3 text-right">{Number(l.precio_unitario).toFixed(2)}€</td>
                          <td className="py-1 pl-3 text-right">{l.dto_pct}%</td>
                          <td className="py-1 pl-3 text-right text-slate-200">{Number(l.subtotal).toFixed(2)}€</td>
                          {es === 'borrador' && (
                            <td className="py-1 text-right">
                              <button
                                disabled={busy === `linea-${l.id}`}
                                onClick={() => accion('crm-proforma-linea-borrar', { linea_id: l.id }, `linea-${l.id}`)}
                                className="text-slate-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                              >
                                <Trash2 size={11} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {pf.fraccionado && (pf.pagos || []).length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Pagos aplazados</p>
                    {(pf.pagos || []).map(p => (
                      <div key={p.id} className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                        <span>Fracción {p.fraccion_num}/{p.total_fracciones}</span>
                        <span className="text-slate-300">{Number(p.importe).toFixed(2)}€</span>
                        <span className={p.estado === 'cobrado' ? 'text-emerald-400' : 'text-amber-400'}>{p.estado}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* acciones de fila para borradores */}
                {es === 'borrador' && (
                  <div className="flex gap-2 flex-wrap mt-1">
                    <button
                      disabled={busy === `borrar-${pf.id}`}
                      onClick={() => accion('crm-proforma-borrar', { proforma_id: pf.id }, `borrar-${pf.id}`)}
                      className="flex items-center gap-1 text-[10px] font-mono uppercase border border-slate-700 rounded-sm px-3 py-1 text-slate-500 hover:text-red-400 hover:border-red-900 disabled:opacity-40 transition-colors"
                    >
                      <Trash2 size={10} /> Borrar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {editProforma && (
        <ModalNuevaProforma
          cliente={cliente}
          operadorId={operadorId}
          n8nUrl={n8nUrl}
          proformaEditar={editProforma}
          onClose={() => setEditProforma(null)}
          onCreated={() => { setEditProforma(null); cargar(); }}
        />
      )}

      {showModal && (
        <ModalNuevaProforma
          cliente={cliente}
          operadorId={operadorId}
          n8nUrl={n8nUrl}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); cargar(); }}
        />
      )}

      {evidencia && <EvidenciaModal contrato={evidencia} onClose={() => setEvidencia(null)} />}
      {contratoVista && <ContratoModal contrato={contratoVista} onClose={() => setContratoVista(null)} />}

      {confirmReabrir && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setConfirmReabrir(null)}
        >
          <div
            className="w-full max-w-sm bg-slate-950 border border-slate-700 rounded-sm shadow-2xl p-5 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <p className="text-xs font-black uppercase tracking-widest text-white font-mono">
                Confirmar reapertura
              </p>
              <button onClick={() => setConfirmReabrir(null)} className="text-slate-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-mono text-slate-300">
                Vas a reabrir la proforma{' '}
                <span className="text-white font-black">{confirmReabrir.numero || `PF-${confirmReabrir.id}`}</span>.
              </p>
              <ul className="flex flex-col gap-1.5 mt-1 pl-3 border-l-2 border-[#D00000]/40">
                <li className="text-[10px] font-mono text-slate-400">
                  La proforma volverá a estado{' '}
                  <span className="text-slate-200 font-black">borrador</span>.
                </li>
                <li className="text-[10px] font-mono text-slate-400">
                  El contrato digital asociado pasará a estado{' '}
                  <span className="text-amber-400 font-black">obsoleto</span>{' '}
                  y deberá generarse uno nuevo.
                </li>
              </ul>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={() => {
                  accion('crm-proforma-reabrir', { proforma_id: confirmReabrir.id }, `reabrir-${confirmReabrir.id}`);
                  setConfirmReabrir(null);
                }}
                className="flex-1 text-[10px] font-mono uppercase tracking-widest bg-[#D00000] hover:bg-red-800 text-white rounded-sm px-4 py-2 transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmReabrir(null)}
                className="flex-1 text-[10px] font-mono uppercase tracking-widest border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-sm px-4 py-2 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ProformasSection.propTypes = {
  cliente:    PropTypes.shape({ id: PropTypes.number.isRequired, nombre_comercial: PropTypes.string }).isRequired,
  n8nUrl:     PropTypes.string.isRequired,
  operadorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default ProformasSection;
