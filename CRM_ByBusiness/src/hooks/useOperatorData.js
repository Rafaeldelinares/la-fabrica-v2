import { useState, useEffect, useCallback } from 'react'
import { n8nGet, n8nPost } from '../shared/hooks/useN8n'

const useOperatorData = (userId, isTraining, leadId = null) => {
  const esSimulacion = isTraining ? 'true' : 'false'

  const [llamadaActiva, setLlamadaActiva] = useState(null)
  const [llamadaActivaId, setLlamadaActivaId] = useState(null)
  const [historial, setHistorial] = useState([])
  const [stats, setStats] = useState(null)
  const [campanas, setCampanas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Compatibilidad con componentes que usan trainingLeads / sesionId
  const [trainingLeads, setTrainingLeads] = useState([])
  const [sesionId, setSesionId] = useState(() => Date.now().toString())

  const [programadas, setProgramadas] = useState([])

  // Cargar callbacks/programadas del operador
  const fetchProgramadas = useCallback(async () => {
    if (!userId) return
    try {
      const rows = await n8nGet('crm-callbacks-operador', { operador_id: userId, es_simulacion: esSimulacion })
      setProgramadas(Array.isArray(rows) ? rows : [])
    } catch (err) {
      console.error('Error cargando programadas:', err)
      setProgramadas([])
    }
  }, [userId, esSimulacion])

  // Cargar llamada activa
  const cargarLlamadaActiva = useCallback(async () => {
    if (!userId) return
    try {
      const rows = await n8nGet('crm-llamada-activa', { operador_id: userId, es_simulacion: esSimulacion })
      if (Array.isArray(rows) && rows.length > 0) {
        setLlamadaActiva(rows[0])
        setLlamadaActivaId(rows[0].llamada_activa_id ?? rows[0].id ?? null)
      } else {
        setLlamadaActiva(null)
        setLlamadaActivaId(null)
      }
    } catch (err) {
      console.error('Error cargando llamada activa:', err)
      setError('Error cargando llamada activa')
    }
  }, [userId, esSimulacion])

  // Cargar stats del operador
  const refreshStats = useCallback(async () => {
    if (!userId) return
    try {
      const data = await n8nGet('crm-resultados-operador', { operador_id: userId, es_simulacion: esSimulacion })
      // El endpoint devuelve {ok: true, stats: {...}} o directamente el objeto stats
      const statsData = data?.stats || (data?.ok === undefined ? data : null)
      setStats(statsData)
    } catch (err) {
      console.error('Error cargando stats:', err)
      setError('Error cargando estadísticas del operador')
      setStats(null)
    }
  }, [userId, esSimulacion])

  // Cargar campañas
  const refreshCampanas = useCallback(async () => {
    try {
      const rows = await n8nGet('crm-campanas', { es_simulacion: esSimulacion })
      setCampanas(Array.isArray(rows) ? rows : [])
    } catch (err) {
      console.error('Error cargando campañas:', err)
    }
  }, [esSimulacion])

  // Cargar historial/agenda de un lead
  const refreshHistorial = useCallback(async (lid) => {
    if (!lid || !userId) return
    try {
      const rows = await n8nGet('crm-agenda-unificada', { operador_id: userId, lead_id: lid, es_simulacion: esSimulacion })
      setHistorial(Array.isArray(rows) ? rows : [])
    } catch (err) {
      console.error('Error cargando historial lead:', err)
      // No crítico — no setear error global
    }
  }, [userId, esSimulacion])

  // Obtener siguiente lead (distribuidor de campanas)
  // El workflow crm-distribuidor-campanas devuelve {ok, lead, total, ...}
  // donde lead es un objeto único (no array). Esto se llama desde OperatorDashboard
  // handleAsignarLead para asignar un lead nuevo al operador.
  const obtenerSiguienteLead = useCallback(async () => {
    if (!userId) return
    try {
      const res = await n8nPost('crm-distribuidor-campanas', { operador_id: userId, mode: 'one' })
      // Normalizar respuesta: puede venir como {ok, lead, total} o como array de un elemento
      const lead = Array.isArray(res) ? res[0] : res?.lead
      if (lead && (lead.id || lead.lead_id)) {
        setLlamadaActiva(lead)
        setLlamadaActivaId(lead.llamada_activa_id ?? lead.id ?? null)
        if (isTraining && Array.isArray(res)) {
          setTrainingLeads(res)
        }
        return lead
      }
      setLlamadaActiva(null)
      setLlamadaActivaId(null)
      return null
    } catch (err) {
      console.error('Error obteniendo siguiente lead:', err)
      setError('Error al obtener el siguiente lead')
      return null
    }
  }, [userId, isTraining])

  // Registrar resultado de una llamada
  const registrarResultado = useCallback(async (datos) => {
    try {
      await n8nPost('crm-registrar-resultado', { ...datos, es_simulacion: isTraining })
      setLlamadaActiva(null)
      setLlamadaActivaId(null)
      await refreshStats()
    } catch (err) {
      console.error('Error registrando resultado:', err)
      setError('Error al registrar el resultado de la llamada')
    }
  }, [isTraining, refreshStats])

  // Carga inicial
  useEffect(() => {
    if (!userId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    Promise.all([
      cargarLlamadaActiva(),
      refreshStats(),
      refreshCampanas(),
      fetchProgramadas()
    ]).finally(() => setLoading(false))
  }, [userId, cargarLlamadaActiva, refreshStats, refreshCampanas, fetchProgramadas])

  // Recargar historial cuando cambia leadId
  useEffect(() => {
    if (!leadId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistorial([])
      return
    }
    refreshHistorial(leadId)
  }, [leadId, refreshHistorial])

  // refreshData como alias de carga completa (compatibilidad).
  // CRITICAL: debe retornar Promise para que callers puedan
  // encadenar .then() / await refreshData() correctamente.
  const refreshData = useCallback(async () => {
    await Promise.all([
      cargarLlamadaActiva(),
      refreshStats(),
      refreshCampanas(),
      fetchProgramadas()
    ]);
    if (leadId) await refreshHistorial(leadId);
  }, [cargarLlamadaActiva, refreshStats, refreshCampanas, fetchProgramadas, refreshHistorial, leadId])

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
    callbacksHoy: programadas.filter(p => {
      const fecha = new Date(p.fecha_programada)
      const ahora = new Date()
      return fecha <= ahora && (p.tipo === 'callback' || p.tipo === 'responsable')
    }),
    compromisosFuturos: programadas.filter(p => new Date(p.fecha_programada) > new Date()),
    refreshProgramadas: fetchProgramadas,

    trainingStats: stats
  }
}

export default useOperatorData
