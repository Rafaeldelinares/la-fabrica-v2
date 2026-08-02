/**
 * Pure helper functions and constants for BackupPanel.
 * @fileoverview Stale detection, status configuration, and formatting.
 */

import { fmtFechaHora } from '../../../utils/dates';

/** Returns true when a timestamp is older than 48 hours. */
const isStaleBackup = (timestamp) => {
  if (!timestamp) return false;
  const ms = Date.now() - new Date(timestamp).getTime();
  return ms > 48 * 60 * 60 * 1000;
};

/** Maps status string to a display config. */
const STATUS_CONFIG = {
  ok:         { label: 'Exitoso',      icon: 'CheckCircle', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  fail:       { label: 'Fallido',      icon: 'XCircle',     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  in_progress: { label: 'En progreso', icon: 'Loader',      color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  pending:    { label: 'Pendiente',    icon: 'Clock',       color: 'text-slate-400',   bg: 'bg-slate-800 text-slate-300 border-slate-700' },
};

/**
 * Returns the status config for a given status string.
 * @param {string} status
 * @returns {object}
 */
const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;

export { isStaleBackup, STATUS_CONFIG, getStatusConfig, fmtFechaHora };
