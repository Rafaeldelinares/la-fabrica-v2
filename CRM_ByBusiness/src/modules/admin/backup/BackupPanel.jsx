import React, { useState } from 'react';
import { useN8nQuery, useN8nMutation } from '../../../shared/hooks/useN8n';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import Skeleton from '../../../shared/ui/Skeleton';
import EmptyState from '../../../shared/ui/EmptyState';
import { useRbac } from '../../../shared/auth/useRbac';
import {
  Database, RefreshCw, Download, Trash2, Clock,
  AlertTriangle, CheckCircle, XCircle, Loader, Calendar
} from 'lucide-react';
import { fmtFechaHora } from '../../../utils/dates';

/** Returns true when a timestamp is older than 48 hours. */
const isStaleBackup = (timestamp) => {
  if (!timestamp) return false;
  const ms = Date.now() - new Date(timestamp).getTime();
  return ms > 48 * 60 * 60 * 1000;
};

/** Maps status string to a display config. */
const STATUS_CONFIG = {
  ok:        { label: 'Exitoso',       icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  fail:      { label: 'Fallido',       icon: XCircle,     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  in_progress:{ label: 'En progreso',  icon: Loader,      color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  pending:   { label: 'Pendiente',     icon: Clock,       color: 'text-slate-400',   bg: 'bg-slate-800 text-slate-300 border-slate-700' },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;

/** Confirmation dialog for manual backup trigger. */
const BackupConfirmDialog = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-80 flex flex-col gap-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Crear backup manual</h3>
      <p className="text-xs text-slate-400">
        Se creará un respaldo completo de la base de datos. ¿Continuar?
      </p>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          Cancelar
        </button>
        <button onClick={onConfirm}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D00000] hover:bg-red-700 text-white text-xs font-medium rounded-sm transition-colors">
          <Database size={12} /> Respaldar
        </button>
      </div>
    </div>
  </div>
);

/** Typed-confirmation dialog for restore. */
const RestoreConfirmDialog = ({ backup, onConfirm, onClose }) => {
  const [typed, setTyped] = useState('');
  const confirmPhrase = backup?.timestamp
    ? new Date(backup.timestamp).toLocaleDateString('es-ES')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-red-500/30 rounded-sm p-6 w-96 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Restaurar backup</h3>
        </div>
        <p className="text-xs text-slate-400">
          Esta acción sobrescribirá los datos actuales con el backup del{' '}
          <span className="text-white font-mono">{confirmPhrase}</span>.
          Los cambios posteriores a ese backup se perderán.
        </p>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Escribe <span className="font-mono text-white">{confirmPhrase}</span> para confirmar
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmPhrase}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-sm text-sm text-white font-mono
              focus:outline-none focus:border-red-500 placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            disabled={typed !== confirmPhrase}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500
              text-white text-xs font-medium rounded-sm transition-colors">
            <RefreshCw size={12} /> Restaurar
          </button>
        </div>
      </div>
    </div>
  );
};

/** Single backup row in the list. */
const BackupItem = ({ backup, onRestore }) => {
  const { icon: Icon, color, bg, label } = getStatusConfig(backup.status);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Icon size={14} className={`shrink-0 ${backup.status === 'in_progress' ? 'animate-spin' : ''} ${color}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white font-mono">
              {fmtFechaHora(backup.timestamp)}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${bg}`}>
              {label}
            </span>
            {isStaleBackup(backup.timestamp) && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <AlertTriangle size={10} /> +48h
              </span>
            )}
          </div>
          {backup.size_mb && (
            <span className="text-[11px] text-slate-500 font-mono">
              {backup.size_mb} MB
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {backup.status === 'ok' && (
          <>
            <button onClick={() => onRestore(backup)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors px-2 py-1 rounded-sm hover:bg-slate-700"
              title="Restaurar este backup">
              <RefreshCw size={12} />
              <span>Restaurar</span>
            </button>
            <button
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors px-2 py-1 rounded-sm hover:bg-slate-700"
              title="Descargar backup" disabled>
              <Download size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * BackupPanel — shows backup status, schedule, and allows manual backup / restore.
 * Reads from CRM_BACKUP_STATUS, triggers via CRM_BACKUP_RESTORE.
 * Requires admin.system.config permission.
 */
const BackupPanel = () => {
  const rbac = useRbac();
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

  const backups = data?.backups || [];
  const schedule = data?.schedule || null;
  const lastBackup = backups[0] || null;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">BACKUPS</h2>
          {schedule && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-sm border border-slate-700">
              <Calendar size={10} />
              {schedule.frequency || 'Diario'} · Next: {schedule.next_run ? fmtFechaHora(schedule.next_run) : '—'}
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

      {/* Last backup summary card */}
      <Card className="!p-0">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Último respaldo</h3>
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-4 w-48" type="rect" />
            <Skeleton className="h-3 w-32" type="rect" />
          </div>
        ) : lastBackup ? (
          <div className="flex items-center gap-6 p-5">
            {(() => {
              const { icon: Icon, color, bg, label } = getStatusConfig(lastBackup.status);
              return (
                <>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-sm border ${bg}`}>
                    <Icon size={18} className={lastBackup.status === 'in_progress' ? `animate-spin ${color}` : color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white font-mono">{fmtFechaHora(lastBackup.timestamp)}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${bg}`}>{label}</span>
                      {isStaleBackup(lastBackup.timestamp) && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400">
                          <AlertTriangle size={10} /> +48h
                        </span>
                      )}
                    </div>
                    {lastBackup.size_mb && (
                      <span className="text-xs text-slate-500 font-mono">{lastBackup.size_mb} MB</span>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={Database}
              title="Sin respaldos disponibles"
              description="No se encontró ningún backup en el sistema."
            />
          </div>
        )}
      </Card>

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
          onConfirm={() => restoreMutation.mutate({ action: 'restore', backup_id: restoreTarget.id })}
          onClose={() => setRestoreTarget(null)}
        />
      )}
    </div>
  );
};

export default BackupPanel;