/**
 * useGbpCompetitiveConfig — hook for the competitive analysis per-client config.
 *
 * Lee y guarda la config (competitive_enabled, competitive_frequency_days,
 * competitive_recipients) del cliente via webhooks n8n.
 *
 * Read: useQuery que dispara el competitive analysis webhook (que ya devuelve
 *       los 3 campos del cliente).
 * Write: useMutation contra crm-update-competitive-config.
 *
 * @since competitive-config-s1 (2026-08-09)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { n8nPost } from '../../../../../../shared/hooks/useN8n';
import { useGbpCompetitiveAnalysis } from './useGbpCompetitiveAnalysis';

const DEFAULT_RECIPIENTS = ['rafaeldelinares@gmail.com'];

const FREQ_OPTIONS = [
  { value: 7,  label: 'Cada 1 semana' },
  { value: 14, label: 'Cada 2 semanas' },
  { value: 21, label: 'Cada 3 semanas' },
  { value: 28, label: 'Cada 4 semanas' },
];

/**
 * Devuelve { cfg, edit, isDirty, setEditEnabled, setEditFreq, addRecipient,
 *            removeRecipient, setNewEmail, newEmail, save, runNow, isSaving,
 *            isRunning } para un cliente dado.
 *
 * Sincroniza edit state con cfg remoto cuando llegan los datos por primera
 * vez. Marca isDirty cuando hay cambios sin guardar.
 */
export const useGbpCompetitiveConfig = (clienteId, canRead, canWrite) => {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useGbpCompetitiveAnalysis(
    canRead ? clienteId : null
  );

  const cfg = useMemo(() => {
    const c = data?.ok ? data.cliente : null;
    return {
      enabled:       c?.competitive_enabled ?? false,
      frequencyDays: c?.competitive_frequency_days ?? 14,
      recipients:    Array.isArray(c?.competitive_recipients) && c.competitive_recipients.length > 0
                        ? c.competitive_recipients
                        : DEFAULT_RECIPIENTS,
    };
  }, [data]);

  const [editEnabled,   setEditEnabled]   = useState(null);
  const [editFreq,       setEditFreq]       = useState(null);
  const [editRecipients, setEditRecipients] = useState(null);
  const [newEmail,       setNewEmail]       = useState('');

  // Sincronizar estado local con cfg remoto cuando llega la primera vez.
  useEffect(() => {
    if (editEnabled   === null) setEditEnabled(cfg.enabled);
    if (editFreq       === null) setEditFreq(cfg.frequencyDays);
    if (editRecipients === null) setEditRecipients(cfg.recipients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.enabled, cfg.frequencyDays, JSON.stringify(cfg.recipients)]);

  const isDirty =
    editEnabled !== cfg.enabled ||
    editFreq !== cfg.frequencyDays ||
    (editRecipients && JSON.stringify([...editRecipients].sort()) !==
     JSON.stringify([...cfg.recipients].sort()));

  const updateMutation = useMutation({
    mutationFn: (body) => n8nPost('crm-update-competitive-config', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gbp-competitive', clienteId] });
    },
  });

  const save = useCallback(async () => {
    await updateMutation.mutateAsync({
      cliente_id: clienteId,
      competitive_enabled:        editEnabled,
      competitive_frequency_days:  editFreq,
      competitive_recipients:      editRecipients,
    });
  }, [clienteId, editEnabled, editFreq, editRecipients, updateMutation]);

  const addRecipient = useCallback(() => {
    const email = newEmail.trim();
    if (!email || !email.includes('@')) return;
    if (editRecipients?.includes(email)) { setNewEmail(''); return; }
    setEditRecipients([...(editRecipients || []), email]);
    setNewEmail('');
  }, [newEmail, editRecipients]);

  const removeRecipient = useCallback((email) => {
    setEditRecipients((editRecipients || []).filter((r) => r !== email));
  }, [editRecipients]);

  const runNow = useCallback(() => {
    // Invalidate cache + force refetch even if data is "fresh" dentro de staleTime
    queryClient.invalidateQueries({ queryKey: ['gbp-competitive', clienteId] });
    return refetch({ cancelRefetch: false });
  }, [refetch, queryClient, clienteId]);

  return {
    cfg,
    edit: { enabled: editEnabled, freq: editFreq, recipients: editRecipients },
    isLoading,
    error,
    isDirty,
    canWrite,
    isSaving:   updateMutation.isPending,
    isRunning:  isLoading,
    saveError:  updateMutation.error,
    saveSuccess: updateMutation.isSuccess,
    setEditEnabled,
    setEditFreq,
    setNewEmail,
    newEmail,
    addRecipient,
    removeRecipient,
    save,
    runNow,
  };
};

export { FREQ_OPTIONS, DEFAULT_RECIPIENTS };
