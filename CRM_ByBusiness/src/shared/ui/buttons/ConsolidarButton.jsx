/**
 * ConsolidarButton — triggers proforma consolidation.
 * Calls CRM_PROFORMA_CONSOLIDAR workflow.
 *
 * @param {number[]} proformaIds - array of selected proforma ids (min 2)
 * @param {function} onSuccess  - called on success
 * @param {boolean} disabled    - force disabled state
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Layers } from 'lucide-react';
import { n8nPost } from '../../hooks/useN8n';

const ConsolidarButton = ({ proformaIds = [], onSuccess, disabled: disabledProp }) => {
  const [loading, setLoading] = useState(false);

  const notEnough = proformaIds.length < 2;
  const disabled = disabledProp || notEnough || loading;

  const handleClick = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      const result = await n8nPost('crm-proforma-consolidar', {
        proforma_ids: proformaIds,
      });
      if (result?.ok) {
        onSuccess?.(result);
      }
    } catch (err) {
      console.error('[ConsolidarButton]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={notEnough ? 'Selecciona 2 o más proformas para consolidar' : 'Consolidar proformas'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm transition-all bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Layers className="w-3.5 h-3.5" />
      {loading ? 'Consolidando…' : 'Consolidar'}
    </button>
  );
};

ConsolidarButton.propTypes = {
  proformaIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  onSuccess: PropTypes.func,
  disabled: PropTypes.bool,
};

export default ConsolidarButton;
