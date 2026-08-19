/**
 * ManualCIDModal — Modal para que el admin introduzca manualmente el CID
 * cuando el sistema no puede encontrarlo automaticamente.
 *
 * Props:
 *   - open: boolean — si el modal está abierto
 *   - onClose: () => void — cierra el modal sin hacer nada
 *   - clienteId: number|string — ID del cliente
 *   - clienteNombre: string — nombre del cliente
 *   - instructions: string[] — instrucciones a mostrar al admin
 *   - onSubmit: (googleCid: string) => void — llamado con el CID ingresado
 *
 * @since 2026-08-13 (Phase 8 — Manual CID feature)
 */
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Search, X, Check, AlertCircle } from 'lucide-react';

// Regex for CID validation: 0xHASH:0xHASH (case-insensitive)
const CID_REGEX = /^0x[a-f0-9]+:0x[a-f0-9]+$/i;
const CID_PLACEHOLDER = '0xABCD1234:0xEFGH5678';

/**
 * Modal para introducir el CID manualmente.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   clienteId: number|string,
 *   clienteNombre?: string,
 *   instructions?: string[],
 *   onSubmit: (googleCid: string) => void,
 * }} props
 */
const ManualCIDModal = ({ open, onClose, clienteId, clienteNombre, instructions = [], onSubmit }) => {
  const [cidInput, setCidInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedInput = cidInput.trim();
  const isValid = CID_REGEX.test(trimmedInput);
  const isEmpty = trimmedInput.length === 0;
  const isInvalid = !isEmpty && !isValid;

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!isValid || isSubmitting) return;
      setIsSubmitting(true);
      try {
        await onSubmit(trimmedInput);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isValid, isSubmitting, onSubmit, trimmedInput]
  );

  const handleInputChange = (e) => {
    setCidInput(e.target.value);
  };

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="CID no encontrado automáticamente"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-sm w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="text-[11px] font-mono text-slate-200 font-semibold tracking-wide">
              CID no encontrado automáticamente
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-sm hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {/* Cliente name */}
          <p className="text-[10px] font-mono text-slate-400">
            El sistema intentó encontrar el CID de{' '}
            <span className="text-slate-200 font-semibold">
              {clienteNombre || `Cliente ${clienteId}`}
            </span>{' '}
            automáticamente pero no tuvo éxito.
          </p>

          {/* Instructions */}
          {instructions.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-sm p-3">
              <ol className="space-y-1.5">
                {instructions.map((instruction, i) => (
                  <li
                    key={i}
                    className="text-[9px] font-mono text-slate-400 flex gap-2"
                  >
                    <span className="text-slate-600 shrink-0">{i + 1}.</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* CID Input */}
          <div className="space-y-1.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={cidInput}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValid) handleSubmit();
                }}
                placeholder={CID_PLACEHOLDER}
                className={`w-full pl-9 pr-10 py-2.5 text-[10px] font-mono bg-slate-950 border rounded-sm text-slate-200 placeholder-slate-700 focus:outline-none transition-colors ${
                  isInvalid
                    ? 'border-red-500/70 focus:border-red-500'
                    : isValid
                    ? 'border-emerald-500/50 focus:border-emerald-500'
                    : 'border-slate-700 focus:border-slate-500'
                }`}
                autoComplete="off"
                spellCheck="false"
              />
              {/* Validation icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValid && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                {isInvalid && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              </div>
            </div>

            {/* Helper text */}
            <p
              className={`text-[9px] font-mono ${
                isInvalid
                  ? 'text-red-400'
                  : isValid
                  ? 'text-emerald-400'
                  : 'text-slate-600'
              }`}
            >
              {isInvalid
                ? 'Formato inválido. Usa: 0xHASH:0xHASH'
                : isValid
                ? 'Formato válido ✓'
                : 'Pega el CID con formato 0xHASH:0xHASH (ej: 0xabc123:0xdef456)'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="text-[10px] font-mono px-3 py-1.5 rounded-sm bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-sm bg-[#D00000] border border-[#D00000]/50 text-white hover:bg-[#D00000]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar y generar informe'}
          </button>
        </div>
      </div>
    </div>
  );
};

ManualCIDModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  clienteId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  clienteNombre: PropTypes.string,
  instructions: PropTypes.arrayOf(PropTypes.string),
  onSubmit: PropTypes.func.isRequired,
};

export default ManualCIDModal;
