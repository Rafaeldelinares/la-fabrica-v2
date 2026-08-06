/**
 * GbpAudit — Run-audit mutation with RBAC per-action gate.
 * Triggers crm-gbp-ficha-audit for the given placeId.
 * Requires gbp.read to render the button and execute the audit (spec REQ-2).
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import React, { useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useRbac } from '../../../../../shared/auth/useRbac';
import AccessDenied from '../../../../../shared/ui/AccessDenied';
import { useGbpAudit } from './hooks/useGbpAudit';

const GbpAudit = ({ placeId, onAuditComplete }) => {
  const { can } = useRbac();
  const { runAudit, isPending } = useGbpAudit();
  const [notif, setNotif] = useState(null);
  const notifTimer = useRef(null);

  const canAudit = can('gbp.read');

  const handleRunAudit = useCallback(async () => {
    if (!canAudit) return;
    if (!placeId?.trim()) return;
    setNotif(null);
    clearTimeout(notifTimer.current);
    try {
      const data = await runAudit(placeId.trim(), { refresh: false });
      if (data?.success !== false) {
        onAuditComplete?.(data);
        setNotif({ type: 'success', message: 'Auditoría ejecutada correctamente.' });
      } else {
        setNotif({ type: 'error', message: data?.error || 'Error en la auditoría.' });
      }
    } catch (err) {
      setNotif({ type: 'error', message: err?.message || 'Error al ejecutar auditoría.' });
    }
    notifTimer.current = setTimeout(() => setNotif(null), 4000);
  }, [canAudit, placeId, runAudit, onAuditComplete]);

  return (
    <div className="flex flex-col gap-2 py-1">
      {!canAudit && <AccessDenied permission="gbp.read" />}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRunAudit}
          disabled={!canAudit || isPending || !placeId?.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-sm border border-[#D00000]/30 text-[#D00000]/70 hover:text-[#D00000] hover:border-[#D00000]/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isPending ? '…' : 'Auditar'}
        </button>
        {placeId && !placeId.trim() && (
          <span className="text-[9px] text-slate-600 font-mono">Place ID requerido</span>
        )}
      </div>
      {notif && (
        <p className={`text-[10px] font-mono px-2 py-1.5 rounded-sm border ${
          notif.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {notif.message}
        </p>
      )}
    </div>
  );
};

GbpAudit.propTypes = {
  placeId:         PropTypes.string,
  onAuditComplete: PropTypes.func,
};

export default GbpAudit;
