/**
 * AprobarProformaButton — marca una proforma como aprobada por el cliente.
 *
 * El gestor usa este botón cuando el cliente confirma por mail/telefono que
 * acepta la proforma. Esto cambia el estado a 'aprobada' y queda lista para
 * la generacion del contrato digital.
 *
 * Solo visible en estados pre-aprobacion (enviada, rellenada, verificada,
 * pendiente_cliente, aceptada). El workflow valida la transicion y rechaza
 * si el estado actual no es valido.
 *
 * @param {object}   proforma  - proforma object
 * @param {function} onSuccess - callback despues de exito
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Check } from 'lucide-react';
import { n8nPost } from '../../hooks/useN8n';
import { useToast } from '../../context/ToastContext';
import { reportError } from '../../errors/reportError';

const AprobarProformaButton = ({ proforma, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleClick = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const result = await n8nPost('crm-proforma-enviar', {
        proforma_id: proforma.id,
        action: 'aprobar',
      });

      if (result?.ok && result?.action === 'aprobada') {
        toast.success('Proforma aprobada por el cliente');
        onSuccess?.(result.proforma ?? proforma);
      } else {
        const msg = result?.message || 'No se pudo aprobar la proforma';
        toast.error(msg);
        reportError(new Error(msg), {
          zoneId: 'AprobarProformaButton',
          proformaId: proforma.id,
          workflowResult: result,
        });
      }
    } catch (err) {
      toast.error('Error de red al aprobar la proforma');
      reportError(err, { zoneId: 'AprobarProformaButton', proformaId: proforma.id });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Marcar la proforma como aprobada por el cliente (confirmo via mail/telefono)"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm transition-all bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Check className="w-3.5 h-3.5" />
      {loading ? 'Aprobando…' : 'Aprobar'}
    </button>
  );
};

AprobarProformaButton.propTypes = {
  proforma: PropTypes.object.isRequired,
  onSuccess: PropTypes.func,
};

export default AprobarProformaButton;
