import React from 'react';

/**
 * ConfirmSaveDialog — confirmation dialog for saving scraper config changes.
 *
 * @param {{ onConfirm: Function, onClose: Function }} props
 * @returns {JSX.Element}
 */
const ConfirmSaveDialog = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-full max-w-sm shadow-2xl">
      <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-widest">Confirmar cambios</h3>
      <p className="text-xs text-slate-400 font-mono mb-6">
        ¿Guardar cambios de configuración de scrapers? Esta acción modifica los parámetros operativos.
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose}
          className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded-sm border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
          Cancelar
        </button>
        <button onClick={onConfirm}
          className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded-sm bg-[#D00000]/10 border border-[#D00000]/40 text-[#D00000] hover:bg-[#D00000]/20 hover:border-[#D00000]/60 transition-colors">
          Confirmar
        </button>
      </div>
    </div>
  </div>
);

export { ConfirmSaveDialog };
