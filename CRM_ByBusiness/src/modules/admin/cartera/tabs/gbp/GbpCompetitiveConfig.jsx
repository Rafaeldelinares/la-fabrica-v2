/**
 * GbpCompetitiveConfig — sección "Config. análisis competitivo" del TabGbp.
 *
 * Permite al operador activar/configurar el análisis automático per-cliente:
 *  - Toggle ☐ Activar
 *  - Dropdown Frecuencia (1/2/3/4 semanas)
 *  - Lista de destinatarios (delegado a GbpConfigRecipients)
 *  - Acciones (delegado a GbpConfigActions)
 *
 * Toda la lógica de datos vive en useGbpCompetitiveConfig.
 *
 * GGA: orquestador delgado (~110 LOC).
 *
 * @since competitive-config-s1 (2026-08-09)
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useRbac } from '../../../../../shared/auth/useRbac';
import { useGbpCompetitiveConfig, FREQ_OPTIONS } from './hooks/useGbpCompetitiveConfig';
import GbpConfigRecipients from './GbpConfigRecipients';
import GbpConfigActions from './GbpConfigActions';

export default function GbpCompetitiveConfig({ cliente }) {
  const rbac = useRbac();
  const canWrite = rbac.can('clientes.update');
  const canRead  = rbac.can('gbp.read');

  const {
    cfg, edit, isLoading, error, isDirty,
    isSaving, isRunning, saveError, saveSuccess,
    setEditEnabled, setEditFreq,
    setNewEmail, newEmail, addRecipient, removeRecipient,
    save, runNow,
  } = useGbpCompetitiveConfig(cliente.id, canRead, canWrite);

  if (!canRead) {
    return (
      <div className="text-[10px] font-mono text-slate-500 py-2">
        Sin permisos para ver config.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <div className="h-3 w-32 bg-slate-800/40 rounded-sm animate-pulse" />
        <div className="h-3 w-48 bg-slate-800/40 rounded-sm animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[10px] font-mono text-red-400 py-2">
        Error cargando config: {error.message || 'desconocido'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-2">

      {/* Toggle: Activar */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`competitive-enabled-${cliente.id}`}
          checked={edit.enabled ?? false}
          disabled={!canWrite}
          onChange={(e) => setEditEnabled(e.target.checked)}
          className="w-3.5 h-3.5 accent-[#D00000] cursor-pointer disabled:opacity-50"
        />
        <label
          htmlFor={`competitive-enabled-${cliente.id}`}
          className="text-[11px] font-mono text-slate-200 cursor-pointer"
        >
          Activar análisis competitivo automático
        </label>
        {edit.enabled && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ON
          </span>
        )}
      </div>

      {/* Frecuencia + Destinatarios (solo si está activado) */}
      {edit.enabled && (
        <>
          <div className="flex items-center gap-2 pl-5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest w-20 shrink-0">
              Frecuencia
            </span>
            <select
              value={edit.freq ?? 14}
              disabled={!canWrite}
              onChange={(e) => setEditFreq(Number(e.target.value))}
              className="flex-1 max-w-xs bg-slate-900 border border-slate-700 rounded-sm px-2 py-1 text-[11px] text-slate-200 font-mono outline-none focus:border-slate-500 disabled:opacity-50"
            >
              {FREQ_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <GbpConfigRecipients
            recipients={edit.recipients}
            canWrite={canWrite}
            newEmail={newEmail}
            onNewEmailChange={setNewEmail}
            onAdd={addRecipient}
            onRemove={removeRecipient}
          />
        </>
      )}

      {/* Acciones */}
      <GbpConfigActions
        canWrite={canWrite}
        isDirty={isDirty}
        isSaving={isSaving}
        isRunning={isRunning}
        saveError={saveError}
        saveSuccess={saveSuccess}
        onSave={save}
        onRunNow={runNow}
        cfg={cfg}
      />
    </div>
  );
}

GbpCompetitiveConfig.propTypes = { cliente: PropTypes.object.isRequired };
