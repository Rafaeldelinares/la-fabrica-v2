/**
 * GbpConfigActions — botones de acción y estado de la config competitiva.
 *
 * Botones:
 *  - "Guardar config" (POST a crm-update-competitive-config)
 *  - "Ejecutar análisis ahora" (refetch del webhook)
 *
 * Indicadores inline:
 *  - Cambios sin guardar / Guardado / Error
 *  - Estado actual (Activo · freq · N destinatarios)
 *
 * @since competitive-config-s1 (2026-08-09)
 */
import React from 'react';
import PropTypes from 'prop-types';
import { freqLabel } from './utils/freqLabel';

export default function GbpConfigActions({
  canWrite, isDirty, isSaving, isRunning, saveError, saveSuccess,
  onSave, onRunNow, cfg,
}) {
  return (
    <>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={onSave}
          disabled={!canWrite || !isDirty || isSaving}
          className="text-[10px] font-mono uppercase tracking-widest rounded-sm border border-emerald-800 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 hover:bg-emerald-500/20 hover:border-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Guardando…' : 'Guardar config'}
        </button>
        <button
          type="button"
          onClick={onRunNow}
          disabled={isRunning}
          className="text-[10px] font-mono uppercase tracking-widest rounded-sm border border-[#D00000]/30 text-[#D00000]/70 px-3 py-1.5 hover:text-[#D00000] hover:border-[#D00000]/60 disabled:opacity-40 transition-colors"
        >
          {isRunning ? 'Ejecutando…' : 'Ejecutar análisis ahora'}
        </button>
        {isDirty && (
          <span className="text-[9px] font-mono text-amber-400">
            Cambios sin guardar
          </span>
        )}
        {saveSuccess && !isDirty && (
          <span className="text-[9px] font-mono text-emerald-400">
            Guardado
          </span>
        )}
        {saveError && (
          <span className="text-[9px] font-mono text-red-400">
            Error: {saveError.message || '?'}
          </span>
        )}
      </div>

      <div className="text-[9px] font-mono text-slate-600 pt-1">
        {cfg.enabled
          ? <>Activo · {freqLabel(cfg.frequencyDays)} · {cfg.recipients.length} destinatario{cfg.recipients.length === 1 ? '' : 's'}</>
          : 'Inactivo (no entra al cron automático)'
        }
      </div>
    </>
  );
}

GbpConfigActions.propTypes = {
  canWrite:    PropTypes.bool.isRequired,
  isDirty:     PropTypes.bool.isRequired,
  isSaving:    PropTypes.bool.isRequired,
  isRunning:   PropTypes.bool.isRequired,
  saveError:   PropTypes.object,
  saveSuccess: PropTypes.bool,
  onSave:      PropTypes.func.isRequired,
  onRunNow:    PropTypes.func.isRequired,
  cfg:         PropTypes.object.isRequired,
};
