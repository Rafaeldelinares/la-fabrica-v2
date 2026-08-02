import React from 'react';
import { useRbac } from '../../../shared/auth/useRbac';
import Card from '../../../shared/ui/Card';
import Skeleton from '../../../shared/ui/Skeleton';
import EmptyState from '../../../shared/ui/EmptyState';
import { AlertTriangle, Database, RefreshCw, Loader, Calendar } from 'lucide-react';
import { useBackupOps } from './useBackupOps';
import { BackupItem } from './BackupItem';
import { BackupConfirmDialog } from './BackupConfirmDialog';
import { RestoreConfirmDialog } from './RestoreConfirmDialog';
import { LastBackupCard } from './LastBackupCard';

/**
 * BackupPanel — shows backup status, schedule, and allows manual backup / restore.
 * Reads from CRM_BACKUP_STATUS, triggers via CRM_BACKUP_RESTORE.
 * Requires admin.system.config permission.
 */
const BackupPanel = () => {
  const rbac = useRbac();
  const {
    backups,
    schedule,
    lastBackup,
    isLoading,
    backupMutation,
    notification,
    restoreTarget,
    setRestoreTarget,
    showBackupConfirm,
    setShowBackupConfirm,
  } = useBackupOps();

  if (!rbac.can('admin.system.config')) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-slate-600" />
          <h2 className="text-lg font-bold text-white mb-2">Acceso restringido</h2>
          <p className="text-sm text-slate-400">Se requiere permiso admin.system.config.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">BACKUPS</h2>
          {schedule && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-sm border border-slate-700">
              <Calendar size={10} />
              {schedule.frequency || 'Diario'} · Next: {schedule.next_run || '—'}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowBackupConfirm(true)}
          disabled={backupMutation.isPending}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white
            bg-[#D00000] hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500
            px-4 py-2 rounded-sm transition-colors">
          {backupMutation.isPending
            ? <><Loader size={11} className="animate-spin" /> Creando…</>
            : <><Database size={11} /> Respaldar ahora</>
          }
        </button>
      </div>

      {/* Last backup card */}
      <LastBackupCard backup={lastBackup} isLoading={isLoading} />

      {/* Backup list */}
      <Card className="!p-0 flex flex-col flex-1 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historial de backups</h3>
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-3 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm">
                <Skeleton className="h-4 w-4" type="rect" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <Skeleton className="h-3 w-40" type="rect" />
                  <Skeleton className="h-2 w-20" type="rect" />
                </div>
                <Skeleton className="h-5 w-16" type="rect" />
              </div>
            ))}
          </div>
        ) : backups.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <EmptyState
              icon={Database}
              title="Sin historial de backups"
              description="Los backups aparecerán aquí tras su primera ejecución."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-4 overflow-y-auto">
            {backups.map((backup) => (
              <BackupItem
                key={backup.id}
                backup={backup}
                onRestore={(b) => setRestoreTarget(b)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Notification toast */}
      {notification && (
        <div className={`text-xs px-4 py-3 rounded-sm border ${
          notification.type === 'success'
            ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800'
            : 'bg-red-900/50 text-red-400 border-red-800'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Confirm dialogs */}
      {showBackupConfirm && (
        <BackupConfirmDialog
          onConfirm={() => backupMutation.mutate({ action: 'backup' })}
          onClose={() => setShowBackupConfirm(false)}
        />
      )}
      {restoreTarget && (
        <RestoreConfirmDialog
          backup={restoreTarget}
          onConfirm={() => backupMutation.mutate({ action: 'restore', backup_id: restoreTarget.id })}
          onClose={() => setRestoreTarget(null)}
        />
      )}
    </div>
  );
};

export default BackupPanel;
