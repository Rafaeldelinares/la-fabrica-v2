import React from 'react';
import { Calendar } from 'lucide-react';
import Skeleton from '../../shared/ui/Skeleton';
import { useCallbacksLogic } from './useCallbacksLogic';
import { CallbackItem } from './CallbackItem';
import { RescheduleModal } from './RescheduleModal';
import { CancelDialog } from './CancelDialog';

/**
 * MisCallbacksPanel — shows today's callbacks for the current operator.
 * Supports reschedule (datetime picker) and cancel (confirmation dialog).
 *
 * @param {Object} props
 * @param {number} props.operatorId - ID of the current operator
 */
const MisCallbacksPanel = ({ operatorId }) => {
  const {
    callbacks,
    isLoading,
    rescheduleMutation,
    cancelMutation,
    refetch,
    notification,
    showNotification,
    selected,
    setSelected,
    toCancel,
    setToCancel,
  } = useCallbacksLogic(operatorId);

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
        {callbacks.length > 0 && (
          <span className="text-[10px] font-mono text-slate-600">
            {callbacks.length} today
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
      ) : callbacks.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {callbacks.map((callback) => (
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
