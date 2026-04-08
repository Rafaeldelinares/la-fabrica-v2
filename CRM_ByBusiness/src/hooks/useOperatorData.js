import { useState, useEffect, useCallback } from 'react'

const N8N = import.meta.env.VITE_N8N_URL

const useOperatorData = (userId, isTraining, leadId = null) => {
  const esSimulacion = isTraining ? 'true' : 'false'

  const [llamadaActiva, setLlamadaActiva] = useState(null)
  const [llamadaActivaId, setLlamadaActivaId] = useState(null)
  const [historial, setHistorial] = useState([])
  const [stats, setStats] = useState(null)
  const [campanas, setCampanas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Compatibilidad con componentes que usan trainingLeads / sesionId
  const [trainingLeads, setTrainingLeads] = useState([])
  const [sesionId, setSesionId] = useState(() => Date.now().toString())

  const [programadas, setProgramadas] = useState([])

  // Cargar callbacks/programadas del operador
  const fetchProgramadas = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(
        `${N8N}/crm-callbacks-operador?operador_id=${userId}&es_simulacion=${esSimulacion}`
      )
      if (!res.ok) throw new Error('Error cargando programadas')
      const rows = await res.json()
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
      const res = await fetch(
        `${N8N}/crm-llamada-activa?operador_id=${userId}&es_simulacion=${esSimulacion}`
      )
      if (!res.ok) throw new Error('Error cargando llamada activa')
      const rows = await res.json()
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
      const res = await fetch(
        `${N8N}/crm-resultados-operador?operador_id=${userId}&es_simulacion=${esSimulacion}`
      )
      if (!res.ok) throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()
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
      const res = await fetch(`${N8N}/crm-campanas?es_simulacion=${esSimulacion}`)
      if (!res.ok) throw new Error('Error cargando campañas')
      const rows = await res.json()
      setCampanas(Array.isArray(rows) ? rows : [])
    } catch (err) {
      console.error('Error cargando campañas:', err)
    }
  }, [esSimulacion])

  // Cargar historial/agenda de un lead
  const refreshHistorial = useCallback(async (lid) => {
    if (!lid || !userId) return
    try {
      const res = await fetch(
        `${N8N}/crm-agenda-unificada?operador_id=${userId}&lead_id=${lid}&es_simulacion=${esSimulacion}`
      )
      if (!res.ok) throw new Error('Error cargando historial')
      const rows = await res.json()
      setHistorial(Array.isArray(rows) ? rows : [])
    } catch (err) {
      console.error('Error cargando historial lead:', err)
      // No crítico — no setear error global
    }
  }, [userId, esSimulacion])

  // Obtener siguiente lead (distribuidor de campanas)
  const obtenerSiguienteLead = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`${N8N}/crm-distribuidor-campanas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operador_id: userId, es_simulacion: isTraining })
      })
      if (!res.ok) throw new Error('Error obteniendo siguiente lead')
      const rows = await res.json()
      if (Array.isArray(rows) && rows.length > 0) {
        const lead = rows[0]
        setLlamadaActiva(lead)
        setLlamadaActivaId(lead.id ?? lead.llamada_activa_id ?? null)
        if (isTraining) {
          setTrainingLeads(rows)
        }
      } else {
        setLlamadaActiva(null)
        setLlamadaActivaId(null)
      }
    } catch (err) {
      console.error('Error obteniendo siguiente lead:', err)
      setError('Error al obtener el siguiente lead')
    }
  }, [userId, isTraining])

  // Registrar resultado de una llamada
  const registrarResultado = useCallback(async (datos) => {
    try {
      const res = await fetch(`${N8N}/crm-registrar-resultado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, es_simulacion: isTraining })
      })
      if (!res.ok) throw new Error('Error registrando resultado')
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
      setHistorial([])
      return
    }
    refreshHistorial(leadId)
  }, [leadId, refreshHistorial])

  // refreshData como alias de carga completa (compatibilidad)
  const refreshData = useCallback(() => {
    Promise.all([
      cargarLlamadaActiva(),
      refreshStats(),
      refreshCampanas(),
      fetchProgramadas()
    ])
    if (leadId) refreshHistorial(leadId)
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
