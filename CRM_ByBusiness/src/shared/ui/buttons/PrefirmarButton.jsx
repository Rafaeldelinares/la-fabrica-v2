/**
 * PrefirmarButton — marks a contract as pre-signed.
 * Calls CRM_CONTRATO_PREFIRMAR workflow.
 *
 * @param {object}  contrato  - contrato object with id and pre_firmado state
 * @param {function} onSuccess - called on successful pre-firmar
 * @param {boolean} disabled   - force disabled state
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FileCheck } from 'lucide-react';
import { n8nPost } from '../../hooks/useN8n';

const PrefirmarButton = ({ contrato, onSuccess, disabled: disabledProp }) => {
  const [loading, setLoading] = useState(false);

  const alreadySigned = contrato?.pre_firmado === true;
  const disabled = disabledProp || alreadySigned || loading;

  const handleClick = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      const result = await n8nPost('crm-contrato-prefirmar', {
        contrato_id: contrato.id,
      });
      if (result?.ok) {
        onSuccess?.(result.contrato ?? contrato);
      }
    } catch (err) {
      console.error('[PrefirmarButton]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={alreadySigned ? 'Ya pre-firmado' : 'Marcar como pre-firmado'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm transition-all bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
    >
      <FileCheck className="w-3.5 h-3.5" />
      {loading ? 'Pre-firmando…' : alreadySigned ? 'Pre-firmado' : 'Pre-firmar'}
    </button>
  );
};

PrefirmarButton.propTypes = {
  contrato: PropTypes.object.isRequired,
  onSuccess: PropTypes.func,
  disabled: PropTypes.bool,
};

export default PrefirmarButton;
