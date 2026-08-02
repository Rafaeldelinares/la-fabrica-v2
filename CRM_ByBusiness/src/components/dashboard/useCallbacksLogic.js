import { useState } from 'react';
import { useN8nQuery, useN8nMutation, n8nGet } from '../../shared/hooks/useN8n';
import { extractCallbacks } from './callbacksHelpers';

/**
 * Hook that encapsulates callbacks data fetching and mutations for MisCallbacksPanel.
 *
 * @param {number|null} operatorId
 * @returns {{ callbacks: Array, isLoading: boolean, rescheduleMutation: object, cancelMutation: object, refetch: Function, notification: object|null, showNotification: Function, setSelected: Function, setToCancel: Function, selected: object|null, toCancel: object|null }}
 */
const useCallbacksLogic = (operatorId) => {
  const [selected, setSelected] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [notification, setNotification] = useState(null);

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

  return {
    callbacks: data ?? [],
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
  };
};

export { useCallbacksLogic };
