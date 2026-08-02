import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Settings, Save, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { useN8nQuery, useN8nMutation } from '../../../shared/hooks/useN8n';
import Card from '../../../shared/ui/Card';
import Skeleton from '../../../shared/ui/Skeleton';
import EmptyState from '../../../shared/ui/EmptyState';
import AccessDenied from '../../../shared/ui/AccessDenied';
import { useRbac } from '../../../shared/auth/useRbac';

/**
 * ScraperConfigPanel — admin UI to view and update scraper operational parameters.
 * Displays: depth, frequency_minutes, localities, excluded_categories.
 * Reads CRM_SCRAPER_CONFIG_GET. Persists changes via CRM_SCRAPER_CONFIG_UPDATE.
 * Requires admin.system.config permission.
 *
 * R7 fallback: if CRM_SCRAPER_CONFIG_GET returns { available: false },
 * panel shows "Configuración via variables de entorno" and disables all fields.
 */
const ScraperConfigPanel = () => {
  const rbac = useRbac();
  const [notification, setNotification] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);

  // Local edit state
  const [localDepth, setLocalDepth] = useState(null);
  const [localFrequency, setLocalFrequency] = useState(null);
  const [localLocalities, setLocalLocalities] = useState(null);
  const [localExcluded, setLocalExcluded] = useState(null);

  // Fetch current config
  const { data, isLoading, isError, refetch } = useN8nQuery(
    ['scraper-config'],
    'crm-scraper-config-get',
    { staleTime: 60_000 }
  );

  const mutation = useN8nMutation('crm-scraper-config-update');

  const isApiUnavailable = data?.available === false;
  const isSaving = mutation.isPending;

  const currentDepth = data?.depth ?? null;
  const currentFrequency = data?.frequency ?? data?.frequency_minutes ?? null;
  const currentLocalities = data?.localities ?? [];
  const currentExcluded = data?.excluded_categories ?? [];

  const displayDepth = localDepth !== null ? localDepth : currentDepth;
  const displayFrequency = localFrequency !== null ? localFrequency : currentFrequency;
  const displayLocalities = localLocalities !== null ? localLocalities : currentLocalities;
  const displayExcluded = localExcluded !== null ? localExcluded : currentExcluded;

  const hasChanges =
    (localDepth !== null && localDepth !== currentDepth) ||
    (localFrequency !== null && localFrequency !== currentFrequency) ||
    (localLocalities !== null && JSON.stringify(localLocalities) !== JSON.stringify(currentLocalities)) ||
    (localExcluded !== null && JSON.stringify(localExcluded) !== JSON.stringify(currentExcluded));

  const clearNotification = useCallback(() => {
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleSave = useCallback(() => {
    const updates = {};
    if (localDepth !== null && localDepth !== currentDepth) updates.depth = Number(localDepth);
    if (localFrequency !== null && localFrequency !== currentFrequency) updates.frequency = String(localFrequency);
    if (localLocalities !== null && JSON.stringify(localLocalities) !== JSON.stringify(currentLocalities)) {
      updates.localities = localLocalities;
    }
    if (localExcluded !== null && JSON.stringify(localExcluded) !== JSON.stringify(currentExcluded)) {
      updates.excluded_categories = localExcluded;
    }

    mutation.mutate(updates, {
      onSuccess: (resp) => {
        if (resp.success === false) {
          setNotification({ type: 'error', message: resp.error || 'Error al guardar configuración.' });
        } else {
          setLocalDepth(null);
          setLocalFrequency(null);
          setLocalLocalities(null);
          setLocalExcluded(null);
          setNotification({ type: 'success', message: 'Configuración actualizada correctamente.' });
          refetch();
        }
        clearNotification();
      },
      onError: (err) => {
        setNotification({ type: 'error', message: err?.message || 'Error de red al guardar.' });
        clearNotification();
      },
    });
    setConfirmOpen(false);
    setPendingValues(null);
  }, [localDepth, localFrequency, localLocalities, localExcluded, currentDepth, currentFrequency, currentLocalities, currentExcluded, mutation, clearNotification, refetch]);

  const openConfirm = useCallback(() => {
    setPendingValues({ depth: localDepth, frequency: localFrequency, localities: localLocalities, excluded: localExcluded });
    setConfirmOpen(true);
  }, [localDepth, localFrequency, localLocalities, localExcluded]);

  if (!rbac.can('admin.system.config')) {
    return <AccessDenied permission="admin.system.config" />;
  }

  // R7 fallback — API not exposed
  if (!isLoading && isApiUnavailable) {
    return (
      <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">CONFIGURACIÓN SCRAPERS</h2>
        </div>
        <Card className="!p-0">
          <div className="py-16 px-4">
            <EmptyState
              icon={Info}
              title="Configuración via variables de entorno"
              description="Los parámetros de los scrapers (depth, frequency, localities, categories) se configuran via variables de entorno en el contenedor Docker. Contacta al equipo de infraestructura para modificarlos."
            />
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (!isLoading && isError) {
    return (
      <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">CONFIGURACIÓN SCRAPERS</h2>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm"
          >
            <RefreshCw size={11} /> Reintentar
          </button>
        </div>
        <Card className="!p-0">
          <div className="py-12">
            <EmptyState
              icon={AlertCircle}
              title="No se pudo cargar la configuración"
              description="Error al conectar con el servicio de configuración. Reintenta en breve."
            />
          </div>
        </Card>
      </div>
    );
  }

  const parseListInput = (raw, current) => {
    if (raw === null || raw === '') return current;
    const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return items.length > 0 ? items : current;
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">CONFIGURACIÓN SCRAPERS</h2>
          {data?.updated_at && (
            <span className="text-[10px] font-mono text-slate-500">
              ↻ {new Date(data.updated_at).toLocaleString('es-ES')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm"
          >
            <RefreshCw size={11} /> Refresh
          </button>
          <button
            onClick={openConfirm}
            disabled={!hasChanges || isSaving || isApiUnavailable}
            className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded-sm border transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[#D00000]/10 border-[#D00000]/30 text-[#D00000] hover:bg-[#D00000]/20 hover:border-[#D00000]/60"
          >
            {isSaving ? (
              <><AlertCircle size={10} /> Guardando…</>
            ) : (
              <><Save size={10} /> Guardar cambios</>
            )}
          </button>
        </div>
      </div>

      {/* Config Fields */}
      <Card className="!p-0 p-5">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-40" type="rect" />
              <Skeleton className="h-9 w-full" type="rect" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-40" type="rect" />
              <Skeleton className="h-9 w-full" type="rect" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-40" type="rect" />
              <Skeleton className="h-20 w-full" type="rect" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Depth */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Profundidad (depth)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={displayDepth ?? ''}
                onChange={(e) => setLocalDepth(e.target.value === '' ? null : Number(e.target.value))}
                disabled={isApiUnavailable}
                className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-sm font-mono text-white w-32 text-center outline-none focus:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <p className="text-[9px] font-mono text-slate-700">
                Nivel de recursión en búsquedas web (1–20). Valor actual: {currentDepth ?? '—'}
              </p>
            </div>

            {/* Frequency */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Frecuencia (minutos)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={displayFrequency ?? ''}
                onChange={(e) => setLocalFrequency(e.target.value === '' ? null : Number(e.target.value))}
                disabled={isApiUnavailable}
                className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-sm font-mono text-white w-32 text-center outline-none focus:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <p className="text-[9px] font-mono text-slate-700">
                Intervalo entre ejecuciones en minutos (5–1440). Valor actual: {currentFrequency ?? '—'}
              </p>
            </div>

            {/* Localities */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Localidades
              </label>
              <input
                type="text"
                value={displayLocalities?.join(', ') ?? ''}
                onChange={(e) => setLocalLocalities(e.target.value === '' ? [] : e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                disabled={isApiUnavailable}
                placeholder="Madrid, Barcelona, Valencia"
                className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-sm font-mono text-white w-full outline-none focus:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <p className="text-[9px] font-mono text-slate-700">
                Lista de localidades separadas por coma. Valor actual: {currentLocalities.length > 0 ? currentLocalities.join(', ') : '—'}
              </p>
            </div>

            {/* Excluded Categories */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Categorías excluidas
              </label>
              <input
                type="text"
                value={displayExcluded?.join(', ') ?? ''}
                onChange={(e) => setLocalExcluded(e.target.value === '' ? [] : e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                disabled={isApiUnavailable}
                placeholder="restaurantes, tiendas"
                className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-sm font-mono text-white w-full outline-none focus:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <p className="text-[9px] font-mono text-slate-700">
                Categorías a excluir de scraping, separadas por coma. Valor actual: {currentExcluded.length > 0 ? currentExcluded.join(', ') : '—'}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Notification */}
      {notification && (
        <div className={`text-[11px] font-mono px-4 py-3 rounded-sm border ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-widest">
              Confirmar cambios
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-6">
              ¿Guardar cambios de configuración de scrapers? Esta acción modifica los parámetros operativos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmOpen(false); setPendingValues(null); }}
                className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded-sm border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded-sm bg-[#D00000]/10 border border-[#D00000]/40 text-[#D00000] hover:bg-[#D00000]/20 hover:border-[#D00000]/60 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ScraperConfigPanel.propTypes = {
  /** Placeholder for future prop API — currently uses global tab routing */
};

export default ScraperConfigPanel;
