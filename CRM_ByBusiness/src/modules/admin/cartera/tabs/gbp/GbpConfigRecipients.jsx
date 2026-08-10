/**
 * GbpConfigRecipients — lista de destinatarios para el competitive analysis.
 *
 * Lista con chips/badges de emails + input para agregar + botón X para eliminar.
 * Usado por GbpCompetitiveConfig para editar recipients antes de guardar.
 *
 * @since competitive-config-s1 (2026-08-09)
 */
import React from 'react';
import PropTypes from 'prop-types';

export default function GbpConfigRecipients({
  recipients, canWrite, newEmail, onNewEmailChange, onAdd, onRemove,
}) {
  return (
    <div className="flex flex-col gap-1.5 pl-5">
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
        Destinatarios
      </span>
      <div className="flex flex-col gap-1">
        {(recipients || []).map((email) => (
          <div
            key={email}
            className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-sm px-2 py-1"
          >
            <span className="text-[11px] font-mono text-slate-300 flex-1 truncate">{email}</span>
            {canWrite && (
              <button
                type="button"
                onClick={() => onRemove(email)}
                className="text-slate-600 hover:text-red-400 text-[14px] leading-none"
                title="Eliminar"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {canWrite && (
          <div className="flex items-center gap-1">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => onNewEmailChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
              placeholder="email@ejemplo.com"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-sm px-2 py-1 text-[11px] text-slate-200 font-mono outline-none focus:border-slate-500 placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={onAdd}
              disabled={!newEmail.includes('@')}
              className="text-[10px] font-mono uppercase tracking-widest rounded-sm border border-slate-700 px-2.5 py-1 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 transition-colors"
            >
              + Añadir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

GbpConfigRecipients.propTypes = {
  recipients: PropTypes.array.isRequired,
  canWrite:   PropTypes.bool.isRequired,
  newEmail:   PropTypes.string,
  onNewEmailChange: PropTypes.func.isRequired,
  onAdd:      PropTypes.func.isRequired,
  onRemove:   PropTypes.func.isRequired,
};
