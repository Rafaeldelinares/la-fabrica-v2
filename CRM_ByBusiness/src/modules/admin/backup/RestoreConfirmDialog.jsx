import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * RestoreConfirmDialog — typed-confirmation dialog for restore operations.
 *
 * @param {{ backup: object, onConfirm: Function, onClose: Function }} props
 * @returns {JSX.Element}
 */
const RestoreConfirmDialog = ({ backup, onConfirm, onClose }) => {
  const [typed, setTyped] = useState('');
  const confirmPhrase = backup?.timestamp
    ? new Date(backup.timestamp).toLocaleDateString('es-ES')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-red-500/30 rounded-sm p-6 w-96 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Restaurar backup</h3>
        </div>
        <p className="text-xs text-slate-400">
          Esta acción sobrescribirá los datos actuales con el backup del{' '}
          <span className="text-white font-mono">{confirmPhrase}</span>.
          Los cambios posteriores a ese backup se perderán.
        </p>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Escribe <span className="font-mono text-white">{confirmPhrase}</span> para confirmar
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmPhrase}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-sm text-sm text-white font-mono
              focus:outline-none focus:border-red-500 placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            disabled={typed !== confirmPhrase}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500
              text-white text-xs font-medium rounded-sm transition-colors">
            <RefreshCw size={12} /> Restaurar
          </button>
        </div>
      </div>
    </div>
  );
};

export { RestoreConfirmDialog };
