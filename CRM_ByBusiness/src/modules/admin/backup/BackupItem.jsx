import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { CheckCircle, XCircle, Loader, Clock, AlertTriangle } from 'lucide-react';
import { isStaleBackup, getStatusConfig, fmtFechaHora } from './backupHelpers';

/**
 * BackupItem — single backup row in the list with restore action.
 *
 * @param {{ backup: object, onRestore: Function }} props
 * @returns {JSX.Element}
 */
const BackupItem = ({ backup, onRestore }) => {
  const statusConfig = getStatusConfig(backup.status);
  const IconComponent = { CheckCircle, XCircle, Loader, Clock }[statusConfig.icon] || Clock;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <IconComponent size={14}
          className={`shrink-0 ${backup.status === 'in_progress' ? 'animate-spin' : ''} ${statusConfig.color}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white font-mono">
              {fmtFechaHora(backup.timestamp)}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${statusConfig.bg}`}>
              {statusConfig.label}
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

export { BackupItem };
