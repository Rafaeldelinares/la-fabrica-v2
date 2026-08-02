import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { toDatetimeLocal, formatScheduledAt } from './callbacksHelpers';

/**
 * RescheduleModal — datetime picker dialog for rescheduling a callback.
 *
 * @param {{ callback: object, onConfirm: Function, onClose: Function }} props
 * @returns {JSX.Element}
 */
const RescheduleModal = ({ callback, onConfirm, onClose }) => {
  const [value, setValue] = useState(toDatetimeLocal(callback?.scheduled_at));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-80 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-white">Reschedule Callback</h3>
        <p className="text-xs text-slate-400">
          {callback?.contacto_nombre || 'Callback'} —{' '}
          {callback ? formatScheduledAt(callback.scheduled_at) : ''}
        </p>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-sm text-sm text-white font-mono focus:outline-none focus:border-amber-500"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(callback, value)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-sm transition-colors"
          >
            <Check size={12} />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export { RescheduleModal };
