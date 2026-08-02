import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import { getStatusConfig, isStaleBackup, fmtFechaHora } from './backupHelpers';

/**
 * LastBackupCard — displays the most recent backup summary.
 *
 * @param {{ backup: object|null, isLoading: boolean }} props
 * @returns {JSX.Element}
 */
const LastBackupCard = ({ backup, isLoading }) => (
  <Card className="!p-0">
    <div className="px-5 py-4 border-b border-slate-800">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Último respaldo</h3>
    </div>
    {isLoading ? (
      <div className="flex flex-col gap-3 p-5">
        <div className="h-4 w-48 bg-slate-800 rounded-sm animate-pulse" />
        <div className="h-3 w-32 bg-slate-800 rounded-sm animate-pulse" />
      </div>
    ) : backup ? (
      <LastBackupContent backup={backup} />
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
);

/** Renders the last backup content with status icon, label, and stale warning. */
const LastBackupContent = ({ backup }) => {
  const { icon: Icon, color, bg, label } = getStatusConfig(backup.status);
  return (
    <div className="flex items-center gap-6 p-5">
      <div className={`flex items-center justify-center w-10 h-10 rounded-sm border ${bg}`}>
        <Icon size={18} className={backup.status === 'in_progress' ? `animate-spin ${color}` : color} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-white font-mono">{fmtFechaHora(backup.timestamp)}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${bg}`}>{label}</span>
          {isStaleBackup(backup.timestamp) && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <AlertTriangle size={10} /> +48h
            </span>
          )}
        </div>
        {backup.size_mb && (
          <span className="text-xs text-slate-500 font-mono">{backup.size_mb} MB</span>
        )}
      </div>
    </div>
  );
};

export { LastBackupCard };
