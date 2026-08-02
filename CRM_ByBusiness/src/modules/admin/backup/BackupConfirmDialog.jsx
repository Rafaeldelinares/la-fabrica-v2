import React from 'react';
import { Database } from 'lucide-react';

/**
 * BackupConfirmDialog — confirmation dialog for manual backup trigger.
 *
 * @param {{ onConfirm: Function, onClose: Function }} props
 * @returns {JSX.Element}
 */
const BackupConfirmDialog = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-80 flex flex-col gap-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Crear backup manual</h3>
      <p className="text-xs text-slate-400">
        Se creará un respaldo completo de la base de datos. ¿Continuar?
      </p>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          Cancelar
        </button>
        <button onClick={onConfirm}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D00000] hover:bg-red-700 text-white text-xs font-medium rounded-sm transition-colors">
          <Database size={12} /> Respaldar
        </button>
      </div>
    </div>
  </div>
);

export { BackupConfirmDialog };
