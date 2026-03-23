import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Plus, ChevronDown, ChevronRight, Trash2,
  CheckCircle, FileText, MessageCircle, Mail, Eye,
} from 'lucide-react';
import ModalNuevaProforma from './ModalNuevaProforma';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const ESTADO_BADGE = {
  borrador:  'bg-slate-700 text-slate-300',
  enviada:   'bg-blue-900/50 text-blue-300',
  aceptada:  'bg-emerald-900/50 text-emerald-300',
  rechazada: 'bg-red-900/50 text-red-400',
};

const COLOR_CANAL = {
  pendiente: 'text-slate-500 hover:text-slate-300',
  enviado:   'text-amber-400 hover:text-amber-300',
  aceptado:  'text-emerald-400 hover:text-emerald-300',
  rechazado: 'text-red-500 hover:text-red-400',
  activo:    'text-emerald-400 hover:text-emerald-300',
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

/* ─── componente principal ────────────────────────────────────────────────── */

/**
 * ProformasSection — Lista de proformas con 5 action icons inline por fila.
 * @param {{ cliente: object, n8nUrl: string, operadorId: string|number }} props
 */
const ProformasSection = ({ cliente, n8nUrl, operadorId }) => {
  const [proformas,    setProformas]    = useState([]);
  const [contratos,    setContratos]    = useState([]);  // contratos_digitales del cliente
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [expanded,     setExpanded]     = useState({});
  const [showModal,    setShowModal]    = useState(false);
  const [busy,         setBusy]         = useState(null);
  const [evidencia,    setEvidencia]    = useState(null); // contrato a mostrar en modal

  const cargar = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([
      fetch(`${n8nUrl}/crm-proformas?cliente_id=${cliente.id}`).then(r => r.json()),
      fetch(`${n8nUrl}/crm-71-get-contratos-digitales?cliente_id=${cliente.id}`).then(r => r.json()),
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
      const d = await r.json();
      if (d.ok || d.id || d.contrato_id) cargar();
      else setError(d.error || `Error en ${endpoint}`);
    } catch {
      setError('Error de conexión');
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
        const contrato = contratos.find(c => c.proforma_id === pf.id) || null;
        const waEstado  = contrato?.whatsapp_estado || 'pendiente';
        const emEstado  = contrato?.email_estado    || 'pendiente';
        const tieneRespuesta = ['aceptado','rechazado'].includes(waEstado) || ['aceptado','rechazado'].includes(emEstado);

        return (
          <div key={pf.id} className="border-b border-slate-800">
            {/* fila principal */}
            <div
              className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-900/40 transition-colors"
              onClick={() => toggle(pf.id)}
            >
              {expanded[pf.id]
                ? <ChevronDown size={12} className="text-slate-500 shrink-0" />
                : <ChevronRight size={12} className="text-slate-500 shrink-0" />}
              <span className="text-xs font-mono text-slate-400 w-32 shrink-0">{pf.numero || `PF-${pf.id}`}</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-sm ${ESTADO_BADGE[pf.estado] || 'bg-slate-700 text-slate-400'}`}>
                {pf.estado}
              </span>
              <span className="text-xs font-mono text-slate-300 ml-auto">{Number(pf.total || 0).toFixed(2)}€</span>

              {/* ── 5 action icons — solo en proformas aceptadas ── */}
              {pf.estado === 'aceptada' && (
                <div className="flex items-center gap-0.5 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {/* 1. Verificación admin */}
                  <ActionIcon
                    icon={CheckCircle}
                    estado={pf.verificada_admin ? 'activo' : 'pendiente'}
                    title={pf.verificada_admin ? 'Verificada por admin' : 'Marcar como verificada'}
                    onClick={() => accion('crm-proforma-verificar', { proforma_id: pf.id, verificada: !pf.verificada_admin }, `verif-${pf.id}`)}
                    disabled={busy === `verif-${pf.id}`}
                  />
                  {/* 2. Contrato PDF */}
                  <ActionIcon
                    icon={FileText}
                    estado={contrato ? 'activo' : 'pendiente'}
                    title={contrato ? 'Ver contrato PDF' : 'Generar contrato digital'}
                    onClick={() => contrato
                      ? window.open(contrato.pdf_url, '_blank')
                      : accion('crm-70-post-contrato-digital', {
                          cliente_id:      cliente.id,
                          proforma_id:     pf.id,
                          objeto:          (pf.lineas || []).map(l => l.descripcion).filter(Boolean).join(', ') || pf.numero || 'Servicios contratados',
                          importe_mensual: pf.total || null,
                          canal_envio:     'whatsapp',
                        }, `contrato-${pf.id}`)
                    }
                    disabled={busy === `contrato-${pf.id}`}
                  />
                  {/* 3. WhatsApp */}
                  <ActionIcon
                    icon={MessageCircle}
                    estado={!contrato ? 'inactivo' : waEstado}
                    title={!contrato ? 'Genera el contrato primero' : `WhatsApp: ${waEstado}`}
                    onClick={() => contrato && accion('crm-72-post-contrato-enviar', { contrato_id: contrato.id }, `wa-${pf.id}`)}
                    disabled={!contrato || busy === `wa-${pf.id}` || waEstado === 'aceptado'}
                  />
                  {/* 4. Email */}
                  <ActionIcon
                    icon={Mail}
                    estado={!contrato ? 'inactivo' : emEstado}
                    title={!contrato ? 'Genera el contrato primero' : `Email: ${emEstado}`}
                    onClick={() => contrato && accion('crm-75-post-contrato-email', { contrato_id: contrato.id }, `em-${pf.id}`)}
                    disabled={!contrato || busy === `em-${pf.id}` || emEstado === 'aceptado'}
                  />
                  {/* 5. Evidencia */}
                  <ActionIcon
                    icon={Eye}
                    estado={tieneRespuesta ? 'activo' : 'inactivo'}
                    title={tieneRespuesta ? 'Ver evidencia de respuesta' : 'Sin respuesta aún'}
                    onClick={() => tieneRespuesta && setEvidencia(contrato)}
                    disabled={!tieneRespuesta}
                  />
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
                        <th className="text-right pb-1 font-normal text-slate-500">Cant.</th>
                        <th className="text-right pb-1 font-normal text-slate-500">Precio</th>
                        <th className="text-right pb-1 font-normal text-slate-500">Dto%</th>
                        <th className="text-right pb-1 font-normal text-slate-500">Subtotal</th>
                        {pf.estado === 'borrador' && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {(pf.lineas || []).map(l => (
                        <tr key={l.id} className="border-b border-slate-900">
                          <td className="py-1 text-slate-300">{l.descripcion}</td>
                          <td className="py-1 text-right">{l.cantidad}</td>
                          <td className="py-1 text-right">{Number(l.precio_unitario).toFixed(2)}€</td>
                          <td className="py-1 text-right">{l.dto_pct}%</td>
                          <td className="py-1 text-right text-slate-200">{Number(l.subtotal).toFixed(2)}€</td>
                          {pf.estado === 'borrador' && (
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
                {(pf.estado === 'borrador' || pf.estado === 'enviada') && (
                  <div className="flex gap-2 flex-wrap mt-1">
                    {pf.estado === 'borrador' && (
                      <button
                        disabled={busy === `borrar-${pf.id}`}
                        onClick={() => accion('crm-proforma-borrar', { proforma_id: pf.id }, `borrar-${pf.id}`)}
                        className="flex items-center gap-1 text-[10px] font-mono uppercase border border-slate-700 rounded-sm px-3 py-1 text-slate-500 hover:text-red-400 hover:border-red-900 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 size={10} /> Borrar
                      </button>
                    )}
                    <button
                      disabled={busy === `aceptar-${pf.id}`}
                      onClick={() => accion('crm-proforma-aceptar', { proforma_id: pf.id }, `aceptar-${pf.id}`)}
                      className="flex items-center gap-1 text-[10px] font-mono uppercase border border-emerald-800 rounded-sm px-3 py-1 text-emerald-400 hover:bg-emerald-900/20 disabled:opacity-40 transition-colors"
                    >
                      <CheckCircle size={10} /> Aceptar
                    </button>
                    {pf.estado === 'aceptada' && pf.requiere_factura && (
                      <button
                        disabled={busy === `factura-${pf.id}`}
                        onClick={() => accion('crm-factura-generar', { proforma_id: pf.id }, `factura-${pf.id}`)}
                        className="flex items-center gap-1 text-[10px] font-mono uppercase border border-blue-800 rounded-sm px-3 py-1 text-blue-400 hover:bg-blue-900/20 disabled:opacity-40 transition-colors"
                      >
                        <FileText size={10} /> Generar factura
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

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
    </div>
  );
};

ProformasSection.propTypes = {
  cliente:    PropTypes.shape({ id: PropTypes.number.isRequired, nombre_comercial: PropTypes.string }).isRequired,
  n8nUrl:     PropTypes.string.isRequired,
  operadorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default ProformasSection;
