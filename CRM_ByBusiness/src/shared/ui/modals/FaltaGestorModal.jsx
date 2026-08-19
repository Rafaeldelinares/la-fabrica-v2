/**
 * FaltaGestorModal — modal shown when a send action is attempted
 * but the cliente has no gestor assigned.
 *
 * @param {boolean}  open       - whether the modal is visible
 * @param {object}    cliente    - cliente without gestor
 * @param {function}  onAsignar  - called with cliente when CTA is clicked
 * @param {function}  onClose    - called when modal is dismissed
 */
import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, X } from 'lucide-react';

const FaltaGestorModal = ({ open, cliente, onAsignar, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-sm shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-red-900/30 border border-red-900/50">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                Gestor no asignado
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {cliente?.nombre ?? 'Este cliente'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-slate-300 leading-relaxed">
            Este cliente no tiene un gestor asignado. Para poder enviar documentos,
            primero asignale un gestor desde su ficha.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => onAsignar(cliente)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-sm bg-[#D00000] hover:bg-red-800 text-white transition-all"
          >
            Asignar gestor ahora
          </button>
        </div>
      </div>
    </div>
  );
};

FaltaGestorModal.propTypes = {
  open: PropTypes.bool.isRequired,
  cliente: PropTypes.object,
  onAsignar: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FaltaGestorModal;
