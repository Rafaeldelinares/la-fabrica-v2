/**
 * CaptureLinkModal — Modal para capturar place_id desde un link de Google Maps.
 * El admin pega la URL, el sistema extrae el place_id / hex_cid / decimal_cid
 * y retorna el valor para auto-llenar el campo en GbpGestionPlaceId.
 * @since gbp-ficha-improvements (2026-08-06)
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { n8nPost } from '../../../../../shared/hooks/useN8n';

const CaptureLinkModal = ({ isOpen, onClose, onExtracted }) => {
  const [url, setUrl]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [result, setResult]     = useState(null); // { place_id, format }
  const closeTimer = useRef(null);

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => clearTimeout(closeTimer.current);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await n8nPost('crm-gbp-extract-place-id', { url: url.trim() });
      if (data.error) {
        setError(data.error === 'empty_url' ? 'URL vacía' : 'URL no reconocida');
      } else {
        setResult({ place_id: data.place_id, format: data.format });
        onExtracted(data.place_id);
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => {
          onClose();
          setUrl('');
          setResult(null);
        }, 1200);
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, [url, onExtracted, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-sm w-full max-w-sm mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-[11px] font-mono text-slate-200 font-semibold tracking-wide">
            📋 Capturar link de Google Maps
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors text-[13px] leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 flex flex-col gap-3">
          <textarea
            rows={3}
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            placeholder="Pega aquí el enlace de Google Maps…"
            className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-[10px] text-slate-300 font-mono outline-none focus:border-slate-500 transition-colors resize-none placeholder:text-slate-700"
          />

          {error && (
            <p className="text-[10px] text-red-400 font-mono">{error}</p>
          )}

          {result && (
            <div className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2">
              <p className="text-[9px] text-slate-500 font-mono mb-1">EXTRAÍDO</p>
              <p className="text-[10px] text-emerald-400 font-mono break-all">{result.place_id}</p>
              <p className="text-[9px] text-slate-600 font-mono mt-0.5">formato: {result.format}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-end">
          <button
            onClick={handleExtract}
            disabled={loading || !url.trim()}
            className="shrink-0 text-[10px] font-mono px-4 py-2 rounded-sm bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 disabled:bg-slate-950 disabled:text-slate-700 disabled:border-slate-800 transition-colors"
          >
            {loading ? '…' : 'Extraer place_id'}
          </button>
        </div>
      </div>
    </div>
  );
};

CaptureLinkModal.propTypes = {
  isOpen:     PropTypes.bool.isRequired,
  onClose:    PropTypes.func.isRequired,
  onExtracted: PropTypes.func.isRequired,
};

export default CaptureLinkModal;
