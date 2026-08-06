/**
 * GbpGestionPlaceId — Place ID management with RBAC per-action gate.
 * Shows the Place ID input + Save button.
 * Admin sees editable controls; supervisor sees read-only.
 * RBAC check is INSIDE the handler (per spec REQ-2).
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import React, { useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { n8nPost } from '../../../../../shared/hooks/useN8n';
import { useRbac } from '../../../../../shared/auth/useRbac';

const GbpGestionPlaceId = ({ clienteId, initialPlaceId = null }) => {
  const { can } = useRbac();
  const [placeId, setPlaceId] = useState(initialPlaceId || '');
  const [guardado, setGuardado] = useState(false);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const saveTimer = useRef(null);

  const isAdmin = can('gbp.write');

  const handleChange = useCallback((e) => {
    setPlaceId(e.target.value);
    setError(null);
    setGuardado(false);
  }, []);

  const handleSavePlaceId = useCallback(async () => {
    if (!can('gbp.write')) return;
    if (!placeId.trim()) return;
    clearTimeout(saveTimer.current);
    setSaving(true);
    setError(null);
    setGuardado(false);
    try {
      await n8nPost('crm-cliente-google-place-id', {
        cliente_id: clienteId,
        google_place_id: placeId.trim(),
      });
      setGuardado(true);
      saveTimer.current = setTimeout(() => setGuardado(false), 2000);
    } catch {
      setError('Error al guardar place_id');
    } finally {
      setSaving(false);
    }
  }, [can, placeId, clienteId]);

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={placeId}
          onChange={handleChange}
          placeholder="ChIJN1rTLr-GyuEmsRBfNs7J4aca"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-sm px-2 py-1.5 text-[10px] text-slate-300 font-mono outline-none focus:border-slate-500 transition-colors placeholder:text-slate-700 min-w-0"
        />
        {isAdmin ? (
          <button
            onClick={handleSavePlaceId}
            disabled={saving || !placeId.trim()}
            className="shrink-0 text-[9px] font-mono px-2.5 py-1.5 rounded-sm border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 transition-colors"
          >
            {guardado ? '✓' : saving ? '…' : 'Guardar'}
          </button>
        ) : (
          <span className="shrink-0 text-[9px] font-mono px-2 py-1.5 text-slate-600 border border-slate-800 rounded-sm">
            Solo lectura
          </span>
        )}
      </div>
      {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}
    </div>
  );
};

GbpGestionPlaceId.propTypes = {
  clienteId:      PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  initialPlaceId: PropTypes.string,
};

export default GbpGestionPlaceId;
