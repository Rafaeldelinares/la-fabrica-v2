/**
 * FirmarButton — marks a contract as signed.
 * Calls CRM_CONTRATO_FIRMAR workflow.
 *
 * @param {object}  contrato  - contrato object with id and firmado state
 * @param {function} onSuccess - called on successful firmar
 * @param {boolean} disabled   - force disabled state
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { PenLine } from 'lucide-react';
import { n8nPost } from '../../hooks/useN8n';

const FirmarButton = ({ contrato, onSuccess, disabled: disabledProp }) => {
  const [loading, setLoading] = useState(false);

  const alreadySigned = contrato?.firmado === true;
  const disabled = disabledProp || alreadySigned || loading;

  const handleClick = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      const result = await n8nPost('crm-contrato-firmar', {
        contrato_id: contrato.id,
      });
      if (result?.ok) {
        onSuccess?.(result.contrato ?? contrato);
      }
    } catch (err) {
      console.error('[FirmarButton]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={alreadySigned ? 'Ya firmado' : 'Marcar como firmado'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm transition-all bg-[#D00000] hover:bg-red-800 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#D00000]"
    >
      <PenLine className="w-3.5 h-3.5" />
      {loading ? 'Firmando…' : alreadySigned ? 'Firmado' : 'Firmar'}
    </button>
  );
};

FirmarButton.propTypes = {
  contrato: PropTypes.object.isRequired,
  onSuccess: PropTypes.func,
  disabled: PropTypes.bool,
};

export default FirmarButton;
