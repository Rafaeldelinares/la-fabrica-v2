import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Save, AlertCircle } from 'lucide-react';
import { useN8nQuery, useN8nMutation } from '../../../shared/hooks/useN8n';

/**
 * FreshnessConfigCard — admin UI to configure lead contactability threshold.
 * Shows current value (default 90 days), numeric input, and save button.
 * Persists to sistema.configuracion via CRM_LEAD_FRESHNESS_CONFIG workflow.
 * Requires admin.system.config permission.
 */
const FreshnessConfigCard = () => {
  const [localValue, setLocalValue] = useState(null);
  const [notification, setNotification] = useState(null);

  // Fetch current threshold via GET with action param
  const { data, isLoading } = useN8nQuery(
    ['lead-freshness-config'],
    'crm-lead-freshness-config',
    { params: { action: 'get' }, staleTime: 60_000 }
  );

  const mutation = useN8nMutation('crm-lead-freshness-config');

  const currentValue = data?.value ?? 90;
  const displayValue = localValue !== null ? localValue : currentValue;

  const handleSave = useCallback(() => {
    if (localValue === null || localValue === currentValue) return;
    const val = Number(localValue);
    if (isNaN(val) || val < 7 || val > 180) {
      setNotification({ type: 'error', message: 'El valor debe estar entre 7 y 180 días.' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    mutation.mutate(
      { action: 'update', value: val },
      {
        onSuccess: (resp) => {
          setLocalValue(null);
          setNotification({ type: 'success', message: `Umbral actualizado a ${resp.value} días.` });
          setTimeout(() => setNotification(null), 4000);
        },
        onError: (err) => {
          setNotification({ type: 'error', message: err?.message || 'Error al guardar.' });
          setTimeout(() => setNotification(null), 4000);
        },
      }
    );
  }, [localValue, currentValue, mutation]);

  const isSaving = mutation.isPending;
  const hasChanged = localValue !== null && localValue !== currentValue;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
          Umbral de contactabilidad
        </p>
        {data?.updated_at && (
          <p className="text-[9px] text-slate-700 font-mono">
            ↻ {new Date(data.updated_at).toLocaleDateString('es-ES')}
          </p>
        )}
      </div>

      {/* Current value display */}
      {isLoading ? (
        <div className="h-8 bg-slate-800/40 rounded-sm animate-pulse" />
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <input
              type="number"
              min={7}
              max={180}
              value={displayValue}
              onChange={(e) => {
                const v = e.target.value === '' ? '' : Number(e.target.value);
                setLocalValue(v === '' ? null : v);
              }}
              className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-1.5 text-sm font-mono text-white w-20 text-center outline-none focus:border-slate-500"
            />
            <span className="text-xs text-slate-500 font-mono">días</span>
          </div>
          <button
            onClick={handleSave}
            disabled={!hasChanged || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-sm border transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[#D00000]/10 border-[#D00000]/30 text-[#D00000] hover:bg-[#D00000]/20 hover:border-[#D00000]/60"
          >
            {isSaving ? (
              <><AlertCircle size={10} /> Guardando…</>
            ) : (
              <><Save size={10} /> Guardar</>
            )}
          </button>
        </div>
      )}

      {/* Helper text */}
      <p className="text-[9px] text-slate-700 font-mono">
        Rango: 7–180 días. Afecta la disponibilidad de leads para reassignación.
      </p>

      {/* Notification */}
      {notification && (
        <div className={`text-[10px] font-mono px-3 py-2 rounded-sm border ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default FreshnessConfigCard;
