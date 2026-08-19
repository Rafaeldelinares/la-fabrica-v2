/**
 * ReenviarCopiaButton — re-sends a document copy to the assigned gestor.
 * Calls the same workflow as Send* but with ?origen=reenvio query param.
 * Hidden when user is not admin. Disabled when cliente has no gestor.
 *
 * @param {'proforma'|'factura'|'contrato'} tipo   - document type
 * @param {number}                              id    - document id
 * @param {object}                              cliente - cliente with gestor_id
 * @param {boolean}                             disabled - force disabled state
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Forward } from 'lucide-react';
import { n8nPost } from '../../hooks/useN8n';

const WEBHOOK_MAP = {
  proforma: 'crm-proforma-enviar',
  factura:  'crm-factura-enviar',
  contrato: 'crm-contrato-enviar-email',
};

const BODY_KEY_MAP = {
  proforma: 'proforma_id',
  factura:  'factura_id',
  contrato: 'contrato_id',
};

const ReenviarCopiaButton = ({ tipo, id, cliente, disabled: disabledProp }) => {
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('op_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setIsAdmin(parsed.role === 'admin' || parsed.rol === 'admin');
      }
    } catch {
      // ignore
    }
  }, []);

  if (!isAdmin) return null;

  const noGestor = cliente?.gestor_id == null;
  const disabled = disabledProp || noGestor || loading;
  const webhook = WEBHOOK_MAP[tipo];
  const bodyKey = BODY_KEY_MAP[tipo];

  const handleClick = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      await n8nPost(
        `${webhook}?origen=reenvio`,
        { [bodyKey]: id }
      );
    } catch (err) {
      console.error('[ReenviarCopiaButton]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={noGestor ? 'Reenvío no disponible — el cliente no tiene gestor asignado' : 'Reenviar al gestor'}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wide rounded-sm transition-all bg-transparent hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent"
    >
      <Forward className="w-3.5 h-3.5" />
      {loading ? 'Reenviando…' : 'Reenviar al gestor'}
    </button>
  );
};

ReenviarCopiaButton.propTypes = {
  tipo: PropTypes.oneOf(['proforma', 'factura', 'contrato']).isRequired,
  id: PropTypes.number.isRequired,
  cliente: PropTypes.object,
  disabled: PropTypes.bool,
};

export default ReenviarCopiaButton;
