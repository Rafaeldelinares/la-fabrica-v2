import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Send, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { n8nGet, n8nPost } from '../../../../shared/hooks/useN8n';

const ESTADO_BADGE = {
  borrador:             'bg-slate-700/60 text-slate-400 border-slate-600',
  enviado:              'bg-blue-900/40 text-blue-300 border-blue-800',
  aceptado:             'bg-emerald-900/40 text-emerald-300 border-emerald-800',
  rechazado:            'bg-red-900/40 text-red-400 border-red-800',
  respuesta_irregular:  'bg-amber-900/40 text-amber-300 border-amber-700',
  vencido:              'bg-slate-800 text-slate-500 border-slate-700',
};

const ESTADO_ICON = {
  borrador:            <Clock size={10} />,
  enviado:             <Send size={10} />,
  aceptado:            <CheckCircle size={10} />,
  rechazado:           <XCircle size={10} />,
  respuesta_irregular: <AlertTriangle size={10} />,
  vencido:             <XCircle size={10} />,
};

/**
 * ContratoDigitalSection — muestra contratos digitales del cliente (solo lectura).
 * Los contratos se generan desde una proforma aceptada (relación 1:1).
 * Permite enviar contratos en estado borrador.
 * @param {{ cliente: object, n8nUrl: string }} props
 */
const ContratoDigitalSection = ({ cliente, n8nUrl }) => {
  const [contratos, setContratos] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [busy,      setBusy]      = useState(null);

  const cargar = useCallback(() => {
    setLoading(true); setError(null);
    n8nGet('crm-contratos-digitales', { cliente_id: cliente.id }, { baseUrl: n8nUrl })
      .then(d => { setContratos(d.contratos || []); setLoading(false); })
      .catch(() => { setError('Error al cargar contratos digitales'); setLoading(false); });
  }, [cliente.id, n8nUrl]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleEnviar = async (contrato) => {
    setBusy(`enviar-${contrato.id}`);
    setError(null);
    try {
      const d = await n8nPost('crm-72-post-contrato-enviar', { contrato_id: contrato.id }, { baseUrl: n8nUrl });
      if (d.ok) cargar();
      else setError(d.message || d.error || 'Error al enviar contrato');
    } catch { setError('Error de conexión al enviar'); }
    finally { setBusy(null); }
  };

  if (loading) return (
    <div className="px-5 py-4 flex flex-col gap-2">
      {[1, 2].map(i => <div key={i} className="h-14 bg-slate-800/40 rounded-sm animate-pulse" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Contratos Digitales</p>
      </div>

      {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}

      {contratos.length === 0 && (
        <div className="border border-dashed border-slate-800 rounded-sm p-5 text-center">
          <p className="text-slate-600 text-xs font-mono">Sin contratos digitales</p>
        </div>
      )}

      {contratos.map(cd => (
        <div key={cd.id} className="border border-slate-800 rounded-sm bg-slate-900/40 px-4 py-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-300 tracking-wider">{cd.referencia}</span>
            <span className={`flex items-center gap-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded-sm border ${ESTADO_BADGE[cd.estado] || ESTADO_BADGE.borrador}`}>
              {ESTADO_ICON[cd.estado]} {cd.estado}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-snug line-clamp-2">{cd.objeto}</p>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-600 font-mono">
              {cd.canal_envio && `Canal: ${cd.canal_envio}`}
              {cd.importe_mensual && ` · ${Number(cd.importe_mensual).toFixed(0)}€/mes`}
            </span>
            {cd.estado === 'borrador' && (
              <button
                disabled={busy === `enviar-${cd.id}`}
                onClick={() => handleEnviar(cd)}
                className="flex items-center gap-1 text-[9px] font-mono uppercase border border-blue-800 rounded-sm px-2.5 py-1 text-blue-400 hover:bg-blue-900/20 disabled:opacity-40 transition-colors"
              >
                <Send size={9} /> {busy === `enviar-${cd.id}` ? 'Enviando…' : 'Enviar'}
              </button>
            )}
          </div>
          {cd.respuesta_raw && (
            <p className="text-[9px] text-amber-400/80 font-mono border-t border-slate-800 pt-1.5 mt-0.5">
              Respuesta: {cd.respuesta_raw}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

ContratoDigitalSection.propTypes = {
  cliente: PropTypes.shape({ id: PropTypes.number.isRequired }).isRequired,
  n8nUrl:  PropTypes.string.isRequired,
};

export default ContratoDigitalSection;
