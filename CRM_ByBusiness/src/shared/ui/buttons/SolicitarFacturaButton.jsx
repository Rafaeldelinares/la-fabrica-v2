/**
 * SolicitarFacturaButton — logs a factura request without changing proforma estado.
 * Calls CRM_PROFORMA_SOLICITAR workflow. Admin-only.
 *
 * @param {object}  proforma  - proforma object
 * @param {function} onSuccess - called on success
 * @param {boolean} disabled  - force disabled state
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FileSignature } from 'lucide-react';
import { n8nPost } from '../../hooks/useN8n';

const SolicitarFacturaButton = ({ proforma, onSuccess, disabled: disabledProp }) => {
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

  const disabled = disabledProp || !isAdmin || loading;

  const handleClick = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      const result = await n8nPost('crm-proforma-solicitar', {
        proforma_id: proforma.id,
      });
      if (result?.ok) {
        onSuccess?.(result.proforma ?? proforma);
      }
    } catch (err) {
      console.error('[SolicitarFacturaButton]', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title="Solicitar factura"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm transition-all bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <FileSignature className="w-3.5 h-3.5" />
      {loading ? 'Solicitando…' : 'Solicitar factura'}
    </button>
  );
};

SolicitarFacturaButton.propTypes = {
  proforma: PropTypes.object.isRequired,
  onSuccess: PropTypes.func,
  disabled: PropTypes.bool,
};

export default SolicitarFacturaButton;
