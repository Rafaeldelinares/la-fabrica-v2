import { useState, useCallback, useMemo } from 'react';
import { useN8nQuery, useN8nMutation } from '../../../shared/hooks/useN8n';
import { hasPendingChanges, buildConfigUpdates } from './scraperConfigHelpers';

/**
 * Hook encapsulating scraper config fetch, local edit state, and save mutation.
 *
 * @returns {{
 *   config: object, isLoading: boolean, isError: boolean, isApiUnavailable: boolean,
 *   localDepth: number|null, localFrequency: number|null, localLocalities: Array|null, localExcluded: Array|null,
 *   setLocalDepth: Function, setLocalFrequency: Function, setLocalLocalities: Function, setLocalExcluded: Function,
 *   displayDepth: number|null, displayFrequency: number|null, displayLocalities: Array, displayExcluded: Array,
 *   hasChanges: boolean, isSaving: boolean, refetch: Function,
 *   notification: object|null, confirmOpen: boolean, setConfirmOpen: Function,
 *   pendingValues: object|null, mutation: object, openConfirm: Function, handleSave: Function
 * }}
 */
const useScraperConfig = () => {
  const [notification, setNotification] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);
  const [localDepth, setLocalDepth] = useState(null);
  const [localFrequency, setLocalFrequency] = useState(null);
  const [localLocalities, setLocalLocalities] = useState(null);
  const [localExcluded, setLocalExcluded] = useState(null);

  const { data, isLoading, isError, refetch } = useN8nQuery(
    ['scraper-config'],
    'crm-scraper-config-get',
    { staleTime: 60_000 }
  );

  const mutation = useN8nMutation('crm-scraper-config-update');

  const isApiUnavailable = data?.available === false;
  const isSaving = mutation.isPending;
  const currentDepth = data?.depth ?? null;
  const currentFrequency = data?.frequency ?? data?.frequency_minutes ?? null;
  const currentLocalities = useMemo(() => data?.localities ?? [], [data]);
  const currentExcluded = useMemo(() => data?.excluded_categories ?? [], [data]);

  const displayDepth = localDepth !== null ? localDepth : currentDepth;
  const displayFrequency = localFrequency !== null ? localFrequency : currentFrequency;
  const displayLocalities = localLocalities !== null ? localLocalities : currentLocalities;
  const displayExcluded = localExcluded !== null ? localExcluded : currentExcluded;

  const localState = useMemo(() => ({ depth: localDepth, frequency: localFrequency, localities: localLocalities, excluded: localExcluded }), [localDepth, localFrequency, localLocalities, localExcluded]);
  const currentState = useMemo(() => ({ depth: currentDepth, frequency: currentFrequency, localities: currentLocalities, excluded: currentExcluded }), [currentDepth, currentFrequency, currentLocalities, currentExcluded]);
  const hasChanges = hasPendingChanges(localState, currentState);

  const clearNotification = useCallback(() => {
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleSave = useCallback(() => {
    const updates = buildConfigUpdates(localState, currentState);
    mutation.mutate(updates, {
      onSuccess: (resp) => {
        if (resp.success === false) {
          setNotification({ type: 'error', message: resp.error || 'Error al guardar configuración.' });
        } else {
          setLocalDepth(null);
          setLocalFrequency(null);
          setLocalLocalities(null);
          setLocalExcluded(null);
          setNotification({ type: 'success', message: 'Configuración actualizada correctamente.' });
          refetch();
        }
        clearNotification();
      },
      onError: (err) => {
        setNotification({ type: 'error', message: err?.message || 'Error de red al guardar.' });
        clearNotification();
      },
    });
    setConfirmOpen(false);
    setPendingValues(null);
  }, [localState, currentState, mutation, clearNotification, refetch]);

  const openConfirm = useCallback(() => {
    setPendingValues({ depth: localDepth, frequency: localFrequency, localities: localLocalities, excluded: localExcluded });
    setConfirmOpen(true);
  }, [localDepth, localFrequency, localLocalities, localExcluded]);

  return {
    config: data,
    isLoading,
    isError,
    isApiUnavailable,
    localDepth,
    localFrequency,
    localLocalities,
    localExcluded,
    setLocalDepth,
    setLocalFrequency,
    setLocalLocalities,
    setLocalExcluded,
    displayDepth,
    displayFrequency,
    displayLocalities,
    displayExcluded,
    hasChanges,
    isSaving,
    refetch,
    notification,
    confirmOpen,
    setConfirmOpen,
    pendingValues,
    mutation,
    openConfirm,
    handleSave,
  };
};

export { useScraperConfig };
