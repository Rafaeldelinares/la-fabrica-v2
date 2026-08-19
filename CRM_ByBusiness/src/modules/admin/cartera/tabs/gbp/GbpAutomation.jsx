/**
 * GbpAutomation — Panel de automatización y estado del sistema GBP.
 *
 * Muestra:
 *  - Health check del cron xiaomi (vivo/muerto, última ejecución)
 *  - Botón para forzar ejecución de análisis del cliente actual
 *
 * @param {{ clienteId: string, clienteNombre?: string }} props
 *
 * @since gbp-ficha-redesign 2026-08-12 (Stage 2)
 */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Zap, Activity, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useN8nQuery, useN8nMutation } from '../../../../../shared/hooks/useN8n';

/**
 * Fetch health status del cron xiaomi.
 * @returns {{ isAlive: boolean, lastCheck: Date|null }}
 */
const useXiaomiHealth = () => {
  const [healthState, setHealthState] = useState({ isAlive: false, lastCheck: null });

  const { data, refetch, isFetching } = useN8nQuery(
    ['gbp-automation-health'],
    'crm-health',
    { staleTime: 30_000 }
  );

  useEffect(() => {
    if (data !== undefined) {
      // n8nHealthCheck usa modo no-cors, por lo que cualquier respuesta
      // (incluyendo error de red) se interpreta como vivo.
      // Solo marcamos muerto si fetch lanza excepción explícitamente.
      const isAlive = data === true || data?.ok === true;
      setHealthState({ isAlive, lastCheck: new Date() }); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [data]);

  return { healthState, refetch, isFetching };
};

/**
 * Mutation para forzar análisis manual del cliente actual.
 */
const useManualRefresh = () => {
  const mutation = useN8nMutation('crm-gbp-ficha-audit');

  const triggerRefresh = useCallback(
    (clienteId) => {
      return mutation.mutateAsync({ cliente_id: clienteId, refresh: true });
    },
    [mutation]
  );

  return {
    triggerRefresh,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
  };
};

const GbpAutomation = ({ clienteId, clienteNombre }) => {
  const { healthState, refetch, isFetching: isCheckingHealth } = useXiaomiHealth();
  const { triggerRefresh, isPending: isRefreshing, isSuccess: refreshSuccess, error: refreshError } = useManualRefresh();

  const [refreshDone, setRefreshDone] = useState(false);

  const handleManualRefresh = useCallback(async () => {
    if (!clienteId || isRefreshing) return;
    setRefreshDone(false);
    await triggerRefresh(clienteId);
    setRefreshDone(true);
  }, [clienteId, isRefreshing, triggerRefresh]);

  const handleRetryHealth = useCallback(() => {
    refetch();
  }, [refetch]);

  const lastCheckFormatted = healthState.lastCheck
    ? healthState.lastCheck.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div className="px-5 py-4 space-y-4">
      {/* ── Health check panel ── */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">
          Estado del sistema
        </p>

        <div className="bg-slate-950/50 border border-slate-800 rounded-sm p-4 space-y-3">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-sm ${
                  healthState.isAlive ? 'bg-emerald-400' : 'bg-red-500'
                }`}
              />
              <span
                className={`text-[11px] font-mono font-semibold ${
                  healthState.isAlive ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {healthState.isAlive ? 'Sistema operativo' : 'Sistema caído'}
              </span>
            </div>

          <button
            onClick={handleRetryHealth}
            disabled={isCheckingHealth}
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded-sm hover:text-slate-300 hover:border-slate-700 transition-colors disabled:opacity-40"
          >
            {isCheckingHealth ? (
              <span className="w-2.5 h-2.5 bg-slate-600 rounded-sm animate-pulse" />
            ) : (
              <RefreshCw size={10} />
            )}
            Reintentar
          </button>
          </div>

          {/* Last check timestamp */}
          <div className="flex items-center gap-2">
            <Activity size={10} className="text-slate-600" />
            <span className="text-[10px] font-mono text-slate-500">
              Última verificación:{' '}
              <span className="text-slate-400">{lastCheckFormatted}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Manual refresh panel ── */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">
          Análisis manual
        </p>

        <div className="bg-slate-950/50 border border-slate-800 rounded-sm p-4 space-y-3">
          {clienteNombre && (
            <p className="text-[10px] font-mono text-slate-500">
              Cliente: <span className="text-slate-300">{clienteNombre}</span>
            </p>
          )}

          {/* Status feedback */}
          {isRefreshing && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="w-2 h-2 bg-slate-600 rounded-sm animate-pulse" />
              Ejecutando análisis…
            </div>
          )}

          {!isRefreshing && refreshSuccess && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
              <CheckCircle size={10} />
              Análisis completado con éxito
            </div>
          )}

          {!isRefreshing && refreshError && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-red-400">
              <XCircle size={10} />
              Error al ejecutar análisis
            </div>
          )}

          {!isRefreshing && !refreshSuccess && !refreshError && !refreshDone && (
            <p className="text-[10px] font-mono text-slate-600">
              Fuerza la actualización de datos del cliente actual desde Google.
            </p>
          )}

          {refreshDone && !isRefreshing && !refreshError && (
            <p className="text-[10px] font-mono text-slate-600">
              Listo. Los datos se actualizarán en breve.
            </p>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || !clienteId}
            className="flex items-center gap-2 px-3 py-2 text-[11px] font-mono font-semibold text-white bg-[#D00000] hover:bg-[#B00000] disabled:opacity-40 disabled:cursor-not-allowed rounded-sm transition-colors"
          >
            {isRefreshing ? (
              <span className="w-2.5 h-2.5 bg-white/40 rounded-sm animate-pulse" />
            ) : (
              <Zap size={11} />
            )}
            Ejecutar análisis ahora
          </button>
        </div>
      </div>
    </div>
  );
};

GbpAutomation.propTypes = {
  /** ID del cliente actual */
  clienteId: PropTypes.string.isRequired,
  /** Nombre del cliente para mostrar (opcional) */
  clienteNombre: PropTypes.string,
};

export default GbpAutomation;
