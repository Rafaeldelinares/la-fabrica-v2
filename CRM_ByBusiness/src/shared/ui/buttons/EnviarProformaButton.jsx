/**
 * EnviarProformaButton — unico boton para enviar o reenviar proforma al gestor.
 *
 * El workflow n8n determina si es "envio" o "reenvio" segun el estado actual:
 *   - Si proforma.estado IN ('rellenada', 'verificada', 'pendiente_cliente',
 *     'aceptada', 'aprobada') → cambia a 'enviada' y envia email (action: 'enviada')
 *   - Si ya esta 'enviada' o posterior → no toca estado, reenvia email (action: 'reenviada')
 *
 * El sistema garantiza que la operacion es idempotente: el operador puede
 * clickear el boton N veces y siempre recibe el mismo resultado.
 *
 * @param {object}   proforma  - proforma object
 * @param {object}   cliente   - cliente object (necesario para useGestorGuard)
 * @param {function} onSuccess - callback despues de exito (recibe el response)
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Send } from 'lucide-react';
import { n8nPost } from '../../hooks/useN8n';
import useGestorGuard from '../../hooks/useGestorGuard';
import { useToast } from '../../context/ToastContext';
import { reportError } from '../../errors/reportError';
import FaltaGestorModal from '../modals/FaltaGestorModal';

const EnviarProformaButton = ({ proforma, cliente, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showFaltaGestor, setShowFaltaGestor] = useState(false);
  const { blocked } = useGestorGuard(cliente);
  const toast = useToast();

  const handleClick = async () => {
    if (blocked) {
      setShowFaltaGestor(true);
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const result = await n8nPost('crm-proforma-enviar', {
        proforma_id: proforma.id,
      });

      if (result?.ok) {
        const verb = result.action === 'reenviada' ? 'reenviada' : 'enviada';
        toast.success(`Proforma ${verb} al gestor`);
        onSuccess?.(result.proforma ?? proforma);
      } else {
        const msg = result?.message || result?.error || 'No se pudo enviar la proforma';
        toast.error(msg);
        reportError(new Error(msg), {
          zoneId: 'EnviarProformaButton',
          proformaId: proforma.id,
          workflowResult: result,
        });
      }
    } catch (err) {
      toast.error('Error de red al enviar la proforma');
      reportError(err, { zoneId: 'EnviarProformaButton', proformaId: proforma.id });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        title={blocked ? 'Asigná un gestor al cliente antes de enviar' : 'Enviar o reenviar la proforma al gestor'}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm transition-all bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="w-3.5 h-3.5" />
        {loading ? 'Enviando…' : 'Enviar al gestor'}
      </button>
      {showFaltaGestor && (
        <FaltaGestorModal cliente={cliente} onClose={() => setShowFaltaGestor(false)} />
      )}
    </>
  );
};

EnviarProformaButton.propTypes = {
  proforma: PropTypes.object.isRequired,
  cliente: PropTypes.object.isRequired,
  onSuccess: PropTypes.func,
};

export default EnviarProformaButton;
