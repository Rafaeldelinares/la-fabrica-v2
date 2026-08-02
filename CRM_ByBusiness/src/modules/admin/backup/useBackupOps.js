import { useState } from 'react';
import { useN8nQuery, useN8nMutation } from '../../../shared/hooks/useN8n';

/**
 * Hook encapsulating backup list fetch and mutation management.
 *
 * @returns {{ backups: Array, isLoading: boolean, refetch: Function, restoreMutation: object, backupMutation: object, notification: object|null, showNotif: Function, setRestoreTarget: Function, setShowBackupConfirm: Function, restoreTarget: object|null, showBackupConfirm: boolean }}
 */
const useBackupOps = () => {
  const [showBackupConfirm, setShowBackupConfirm] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [notification, setNotification] = useState(null);

  const { data, isLoading, refetch } = useN8nQuery(
    ['backup-status'],
    'crm-backup-status',
    { staleTime: 60_000 }
  );

  const restoreMutation = useN8nMutation('crm-backup-restore', {
    onSuccess: () => {
      setRestoreTarget(null);
      showNotif('success', 'Restauración iniciada correctamente');
      refetch();
    },
    onError: (err) => {
      showNotif('error', err?.message || 'Error al restaurar backup');
    },
  });

  const backupMutation = useN8nMutation('crm-backup-restore', {
    onSuccess: () => {
      setShowBackupConfirm(false);
      showNotif('success', 'Backup manual iniciado');
      refetch();
    },
    onError: (err) => {
      setShowBackupConfirm(false);
      showNotif('error', err?.message || 'Error al iniciar backup');
    },
  });

  const showNotif = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  return {
    backups: data?.backups || [],
    schedule: data?.schedule || null,
    lastBackup: (data?.backups || [])[0] || null,
    isLoading,
    refetch,
    restoreMutation,
    backupMutation,
    notification,
    showNotif,
    restoreTarget,
    setRestoreTarget,
    showBackupConfirm,
    setShowBackupConfirm,
  };
};

export { useBackupOps };
