import React from 'react';
import { Phone, Clock, RefreshCw, X } from 'lucide-react';
import { formatScheduledAt, getCallbackStatusClass } from './callbacksHelpers';

/**
 * CallbackItem — renders a single callback row with reschedule/cancel actions.
 *
 * @param {{ callback: object, onReschedule: Function, onCancel: Function }} props
 * @returns {JSX.Element}
 */
const CallbackItem = ({ callback, onReschedule, onCancel }) => {
  const { bg, text, border } = getCallbackStatusClass(callback.status);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm">
      <div className="flex items-center gap-3 min-w-0">
        <Phone size={14} className="text-slate-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {callback.contacto_nombre || callback.nombre || 'Sin nombre'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock size={10} className="text-slate-500" />
            <span className="text-xs font-mono text-slate-400">
              {formatScheduledAt(callback.scheduled_at)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${bg} ${text} ${border}`}>
          {callback.status}
        </span>
        <button
          onClick={() => onReschedule(callback)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors px-2 py-1 rounded-sm hover:bg-slate-800"
          title="Reschedule"
        >
          <RefreshCw size={12} />
          <span>Reschedule</span>
        </button>
        <button
          onClick={() => onCancel(callback)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded-sm hover:bg-slate-800"
          title="Cancel"
        >
          <X size={12} />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
};

export { CallbackItem };
