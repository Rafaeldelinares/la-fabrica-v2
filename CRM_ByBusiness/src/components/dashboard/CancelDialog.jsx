import React from 'react';
import { X } from 'lucide-react';

/**
 * CancelDialog — confirmation dialog for cancelling a callback.
 *
 * @param {{ callback: object, onConfirm: Function, onClose: Function }} props
 * @returns {JSX.Element}
 */
const CancelDialog = ({ callback, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-80 flex flex-col gap-4">
      <h3 className="text-sm font-bold text-white">Cancel Callback</h3>
      <p className="text-xs text-slate-400">
        ¿Cancelar este callback for{' '}
        <span className="text-white font-medium">
          {callback?.contacto_nombre || 'this contact'}?
        </span>
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          No
        </button>
        <button
          onClick={() => onConfirm(callback)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-sm transition-colors"
        >
          <X size={12} />
          Yes, cancel
        </button>
      </div>
    </div>
  </div>
);

export { CancelDialog };
