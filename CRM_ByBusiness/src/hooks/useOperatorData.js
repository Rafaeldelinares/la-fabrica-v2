import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { n8nGet, n8nPost } from '../shared/hooks/useN8n'
import { useN8nQuery, useN8nMutation } from '../shared/hooks/useN8n'

/**
 * Custom hook for operator data — refactored from useEffect+n8nGet to useN8nQuery.
 * Preserves the exact return shape of the original hook for backward compatibility.
 *
 * Internally composes 5 independent useN8nQuery calls:
 *   - callback-programadas
 *   - llamada-activa
 *   - resultados-operador (stats)
 *   - campanas
 *   - agenda-unificada (historial por leadId)
 *
 * And 1 useN8nMutation:
 *   - registrar-resultado
 *
 * @param {string|null} userId
 * @param {boolean} isTraining
 * @param {string|null} leadId
 */
const useOperatorData = (userId, isTraining, leadId = null) => {
  const esSimulacion = isTraining ? 'true' : 'false'
  const queryClient = useQueryClient()

  // ─── Query keys ────────────────────────────────────────────────────────────
  const keys = {
    programadas: ['operator-callbacks', userId, esSimulacion],
    llamadaActiva: ['operator-llamada-activa', userId, esSimulacion],
    stats: ['operator-stats', userId, esSimulacion],
    campanas: ['operator-campanas', esSimulacion],
    historial: ['operator-historial', userId, leadId, esSimulacion],
  }

  // ─── Query 1: callbacks programadas ───────────────────────────────────────
  const {
    data: rowsProgramadas = [],
    isLoading: isLoadingProgramadas,
    isError: isErrorProgramadas,
    error: errorProgramadas,
  } = useN8nQuery(keys.programadas, 'crm-callbacks-operador', {
    params: { operador_id: String(userId ?? ''), es_simulacion: esSimulacion },
    enabled: Boolean(userId),
    staleTime: 30_000,
  })

  const programadas = Array.isArray(rowsProgramadas) ? rowsProgramadas : []

  // ─── Query 2: llamada activa ───────────────────────────────────────────────
  const {
    data: rowsLlamadaActiva = [],
    isLoading: isLoadingLlamadaActiva,
    isError: isErrorLlamadaActiva,
    error: errorLlamadaActiva,
  } = useN8nQuery(keys.llamadaActiva, 'crm-llamada-activa', {
    params: { operador_id: String(userId ?? ''), es_simulacion: esSimulacion },
    enabled: Boolean(userId),
    staleTime: 15_000,
  })

  const rawLlamadaActiva =
    Array.isArray(rowsLlamadaActiva) && rowsLlamadaActiva.length > 0
      ? rowsLlamadaActiva[0]
      : null
  const llamadaActiva = rawLlamadaActiva ?? null
  const llamadaActivaId = rawLlamadaActiva
    ? rawLlamadaActiva.llamada_activa_id ?? rawLlamadaActiva.id ?? null
    : null

  // ─── Query 3: stats del operador ──────────────────────────────────────────
  const {
    data: rawStats,
    isLoading: isLoadingStats,
    isError: isErrorStats,
    error: errorStats,
  } = useN8nQuery(keys.stats, 'crm-resultados-operador', {
    params: { operador_id: String(userId ?? ''), es_simulacion: esSimulacion },
    enabled: Boolean(userId),
    staleTime: 30_000,
  })

  // Normalize: endpoint returns {ok: true, stats: {...}} or the stats object directly
  const stats =
    rawStats?.stats ?? (rawStats?.ok === undefined ? rawStats : null)

  // ─── Query 4: campañas ────────────────────────────────────────────────────
  const {
    data: rowsCampanas = [],
    isLoading: isLoadingCampanas,
    isError: isErrorCampanas,
  } = useN8nQuery(keys.campanas, 'crm-campanas', {
    params: { es_simulacion: esSimulacion },
    staleTime: 60_000,
  })

  const campanas = Array.isArray(rowsCampanas) ? rowsCampanas : []

  // ─── Query 5: historial/agenda por lead ───────────────────────────────────
  const {
    data: rowsHistorial = [],
    isLoading: isLoadingHistorial,
    isError: isErrorHistorial,
    error: errorHistorial,
    refetch: refetchHistorialFn,
  } = useN8nQuery(keys.historial, 'crm-agenda-unificada', {
    params: {
      operador_id: String(userId ?? ''),
      lead_id: String(leadId ?? ''),
      es_simulacion: esSimulacion,
    },
    enabled: Boolean(userId && leadId),
    staleTime: 30_000,
  })

  const historial = Array.isArray(rowsHistorial) ? rowsHistorial : []

  // ─── Combined loading (true on first fetch, false once all resolved) ────────
  const loading =
    isLoadingProgramadas ||
    isLoadingLlamadaActiva ||
    isLoadingStats ||
    isLoadingCampanas ||
    (Boolean(leadId) && isLoadingHistorial)

  // ─── Combined error (first non-null error from any query) ───────────────────
  const error =
    isErrorLlamadaActiva
      ? errorLlamadaActiva
      : isErrorStats
        ? errorStats
        : isErrorHistorial
          ? errorHistorial
          : isErrorProgramadas
            ? errorProgramadas
            : isErrorCampanas
              ? 'Error cargando campañas'
              : null

  // ─── Compatibilidad: trainingLeads / sesionId ──────────────────────────────
  const [trainingLeads, setTrainingLeads] = [ [], () => {} ]
  const [sesionId, setSesionId] = [
    String(Date.now()),
    () => {},
  ]

  // ─── Mutation: registrar resultado ─────────────────────────────────────────
  const mutation = useN8nMutation('crm-registrar-resultado')

  const registrarResultado = useCallback(
    async (datos) => {
      await mutation.mutateAsync({ ...datos, es_simulacion: isTraining })
      // After registering a result, clear the active call and refresh stats
      queryClient.setQueryData(keys.llamadaActiva, null)
      queryClient.invalidateQueries({ queryKey: keys.stats })
    },
    [mutation, queryClient, isTraining, keys.stats, keys.llamadaActiva],
  )

  // ─── Refresh helpers ───────────────────────────────────────────────────────
  const refetchProgramadas = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.programadas })
  }, [queryClient, keys.programadas])

  const refreshStats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.stats })
  }, [queryClient, keys.stats])

  const refreshCampanas = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.campanas })
  }, [queryClient, keys.campanas])

  const refreshHistorial = useCallback(() => {
    return refetchHistorialFn()
  }, [refetchHistorialFn])

  /**
   * Full refresh — invalidates all operator queries and returns a Promise.
   * Preserves the Promise-returning contract of the original refreshData.
   */
  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.programadas }),
      queryClient.invalidateQueries({ queryKey: keys.llamadaActiva }),
      queryClient.invalidateQueries({ queryKey: keys.stats }),
      queryClient.invalidateQueries({ queryKey: keys.campanas }),
      leadId
        ? queryClient.invalidateQueries({ queryKey: keys.historial })
        : Promise.resolve(),
    ])
  }, [queryClient, keys, leadId])

  // ─── obtenerSiguienteLead — uses n8nPost directly (not a useN8nQuery) ─────
  const obtenerSiguienteLead = useCallback(async () => {
    if (!userId) return null
    try {
      const res = await n8nPost('crm-distribuidor-campanas', {
        operador_id: userId,
        mode: 'one',
      })
      const lead = Array.isArray(res) ? res[0] : res?.lead
      if (lead && (lead.id || lead.lead_id)) {
        // Update the query cache so hook state reflects the new active lead
        queryClient.setQueryData(keys.llamadaActiva, [lead])
        if (isTraining && Array.isArray(res)) {
          setTrainingLeads(res)
        }
        return lead
      }
      // No lead available — clear the active call in cache
      queryClient.setQueryData(keys.llamadaActiva, null)
      return null
    } catch {
      return null
    }
  }, [userId, isTraining, queryClient, keys.llamadaActiva])

  // ─── Derived: callbacks de hoy ─────────────────────────────────────────────
  const callbacksHoy = programadas.filter((p) => {
    const fecha = new Date(p.fecha_programada)
    const ahora = new Date()
    return fecha <= ahora && (p.tipo === 'callback' || p.tipo === 'responsable')
  })

  const compromisosFuturos = programadas.filter(
    (p) => new Date(p.fecha_programada) > new Date(),
  )

  // ─── Return — exact same shape as original ─────────────────────────────────
  return {
    // Estado principal
    llamadaActiva,
    llamadaActivaId,
    historial,
    stats,
    campanas,
    loading,
    error,

    // Acciones
    obtenerSiguienteLead,
    registrarResultado,
    refreshStats,
    refreshHistorial,
    refreshCampanas,
    refreshData,

    // Compatibilidad con componentes existentes
    trainingLeads,
    setTrainingLeads,
    sesionId,
    setSesionId,

    // Programadas / callbacks
    programadas,
    callbacksHoy,
    compromisosFuturos,
    refreshProgramadas,

    trainingStats: stats,
  }
}

export default useOperatorData
