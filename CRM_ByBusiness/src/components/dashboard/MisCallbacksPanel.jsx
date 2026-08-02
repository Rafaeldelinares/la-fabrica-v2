import React, { useState } from 'react';
import { Phone, Calendar, Clock, X, Check, RefreshCw } from 'lucide-react';
import { useN8nQuery, useN8nMutation, n8nGet } from '../../shared/hooks/useN8n';
import Skeleton from '../../shared/ui/Skeleton';

/**
 * Extracts callbacks from n8n response array.
 * n8n returns: [{json: {ok, callbacks_hoy: [...]}}]
 */
const extractCallbacks = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  const json = data[0]?.json;
  if (!json) return [];
  return json.callbacks_hoy || [];
};

/**
 * Formats a datetime string for display.
 */
const formatScheduledAt = (isoString) => {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formats a date string for datetime-local input (YYYY-MM-DDTHH:mm).
 */
const toDatetimeLocal = (isoString) => {
  if (!isoString) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  }
  const d = new Date(isoString);
  d.setMinutes(d.getMinutes() + 30);
  return d.toISOString().slice(0, 16);
};

// ─── Sub-components ────────────────────────────────────────────────────────

/** Single callback row */
const CallbackItem = ({ callback, onReschedule, onCancel }) => {
  const statusClass =
    callback.status === 'programado'
      ? 'bg-slate-800 text-slate-300 border-slate-700'
      : 'bg-slate-700 text-slate-400 border-slate-600';

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
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${statusClass}`}>
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

/** Reschedule modal with datetime picker */
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

/** Cancel confirmation dialog */
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

// ─── Main panel ────────────────────────────────────────────────────────────

/**
 * MisCallbacksPanel — shows today's callbacks for the current operator.
 * Supports reschedule (datetime picker) and cancel (confirmation dialog).
 *
 * @param {Object} props
 * @param {number} props.operatorId - ID of the current operator
 */
const MisCallbacksPanel = ({ operatorId }) => {
  const [selected, setSelected] = useState(null); // callback for reschedule
  const [toCancel, setToCancel] = useState(null); // callback to cancel
  const [notification, setNotification] = useState(null); // {type, message}

  const { data, isLoading, refetch } = useN8nQuery(
    ['callbacks-hoy', operatorId],
    'crm-callbacks-operador',
    {
      queryFn: () => n8nGet('crm-callbacks-operador', { operador_id: operatorId }),
      refetchInterval: 60_000,
      staleTime: 30_000,
      enabled: Boolean(operatorId),
      select: extractCallbacks,
    }
  );

  const rescheduleMutation = useN8nMutation('crm-callbacks-gestionar');
  const cancelMutation = useN8nMutation('crm-callbacks-gestionar');

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleReschedule = (callback) => setSelected(callback);

  const handleRescheduleConfirm = async (callback, newDatetime) => {
    try {
      await rescheduleMutation.mutateAsync({
        action: 'reschedule',
        callback_id: callback.id,
        operador_id: operatorId,
        new_datetime: newDatetime,
      });
      setSelected(null);
      showNotification('success', 'Callback rescheduled');
      refetch();
    } catch {
      showNotification('error', 'Could not reschedule callback');
    }
  };

  const handleCancel = (callback) => setToCancel(callback);

  const handleCancelConfirm = async (callback) => {
    try {
      await cancelMutation.mutateAsync({
        action: 'cancel',
        callback_id: callback.id,
        operador_id: operatorId,
      });
      setToCancel(null);
      showNotification('success', 'Callback cancelled');
      refetch();
    } catch {
      showNotification('error', 'Could not cancel callback');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Calendar size={12} className="text-slate-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          My Callbacks
        </span>
        {data && data.length > 0 && (
          <span className="text-[10px] font-mono text-slate-600">
            {data.length} today
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-3" type="circle" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" type="rect" />
                  <Skeleton className="h-2 w-12" type="rect" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" type="rect" />
                <Skeleton className="h-5 w-16" type="rect" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {data.map((callback) => (
            <CallbackItem
              key={callback.id}
              callback={callback}
              onReschedule={handleReschedule}
              onCancel={handleCancel}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-6 text-xs text-slate-500">
          Sin callbacks programados
        </div>
      )}

      {/* Notification toast */}
      {notification && (
        <div
          className={`text-xs px-3 py-2 rounded-sm ${
            notification.type === 'success'
              ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
              : 'bg-red-900/50 text-red-400 border border-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Modals */}
      {selected && (
        <RescheduleModal
          callback={selected}
          onConfirm={handleRescheduleConfirm}
          onClose={() => setSelected(null)}
        />
      )}
      {toCancel && (
        <CancelDialog
          callback={toCancel}
          onConfirm={handleCancelConfirm}
          onClose={() => setToCancel(null)}
        />
      )}
    </div>
  );
};

export default MisCallbacksPanel;
