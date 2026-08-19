/**
 * SendFacturaButton — sends a factura PDF to the gestor.
 *
 * @param {object}  factura   - factura object
 * @param {object}  cliente    - cliente object with gestor_id
 * @param {function} onSuccess - called on success
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Send } from 'lucide-react';
import { n8nPost } from '../../hooks/useN8n';
import useGestorGuard from '../../hooks/useGestorGuard';

const SendFacturaButton = ({ factura, cliente, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { blocked } = useGestorGuard(cliente);

  const handleClick = async () => {
    if (blocked || loading) return;
    setLoading(true);
    try {
      const result = await n8nPost('crm-factura-enviar', {
        factura_id: factura.id,
      });
      if (result?.ok) {
        onSuccess?.(result.factura ?? factura);
      }
    } catch (err) {
      console.error('[SendFacturaButton]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={blocked || loading}
      title="Enviar factura al gestor"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm transition-all bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Send className="w-3.5 h-3.5" />
      {loading ? 'Enviando…' : 'Enviar'}
    </button>
  );
};

SendFacturaButton.propTypes = {
  factura: PropTypes.object.isRequired,
  cliente: PropTypes.object.isRequired,
  onSuccess: PropTypes.func,
};

export default SendFacturaButton;
