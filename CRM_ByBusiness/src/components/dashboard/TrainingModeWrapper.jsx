import React, { useState, useEffect } from 'react'
import { GraduationCap, RefreshCw, AlertCircle } from 'lucide-react'

const N8N = import.meta.env.VITE_N8N_URL

/**
 * Wrapper component para manejar lógica de modo entrenamiento
 * Extrae la lógica dual training/production de OperatorDashboard
 * 
 * @param {Object} props
 * @param {React.ReactElement} props.children - Componente hijo a envolver
 * @param {boolean} props.isTraining - Si está en modo entrenamiento
 * @param {string} props.userId - ID del operador
 * @param {Function} props.onError - Callback para errores
 */
const TrainingModeWrapper = ({ children, isTraining, userId, onError }) => {
  const [trainingData, setTrainingData] = useState({
    leads: [],
    stats: null,
    sesionId: null,
    loading: false,
    error: null
  })

  // Iniciar sesión de entrenamiento
  useEffect(() => {
    if (!isTraining || !userId || trainingData.sesionId) return

    const iniciarSesion = async () => {
      setTrainingData(prev => ({ ...prev, loading: true, error: null }))
      
      try {
        const response = await fetch(`${N8N}/crm-iniciar-sesion-entrenamiento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operador_id: userId })
        })
        
        if (!response.ok) throw new Error('Error iniciando sesión entrenamiento')
        
        const result = await response.json()
        if (result.ok) {
          setTrainingData(prev => ({
            ...prev,
            sesionId: result.sesion.id,
            loading: false
          }))
        } else {
          throw new Error(result.message || 'Error desconocido')
        }
      } catch (error) {
        console.error('Error iniciando sesión entrenamiento:', error)
        const errorMsg = 'Error iniciando sesión de entrenamiento'
        setTrainingData(prev => ({ ...prev, error: errorMsg, loading: false }))
        // Usar referencia estable para callback de error
        if (typeof onError === 'function') {
          onError(errorMsg)
        }
      }
    }

    iniciarSesion()
    // Nota: onError se excluye intencionalmente de dependencias porque
    // es un callback del padre que puede cambiar en cada render.
    // Usamos check typeof === 'function' para evitar problemas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTraining, userId, trainingData.sesionId])

  // Cargar leads de entrenamiento
  useEffect(() => {
    if (!isTraining || !userId) return

    const cargarLeads = async () => {
      try {
        const response = await fetch(`${N8N}/crm-leads-entrenamiento?operador_id=${userId}`)
        if (!response.ok) throw new Error('Error cargando leads entrenamiento')
        
        const result = await response.json()
        if (result.ok) {
          setTrainingData(prev => ({
            ...prev,
            leads: result.leads || []
          }))
        }
      } catch (error) {
        console.error('Error cargando leads entrenamiento:', error)
        const errorMsg = 'Error cargando clientes de práctica'
        setTrainingData(prev => ({ ...prev, error: errorMsg }))
        // Usar referencia estable para callback de error
        if (typeof onError === 'function') {
          onError(errorMsg)
        }
      }
    }

    cargarLeads()
    // Nota: onError se excluye intencionalmente de dependencias para evitar
    // re-ejecuciones constantes cuando el padre se re-renderiza
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTraining, userId])

  // Cargar estadísticas de entrenamiento
  const _cargarStats = async () => {
    if (!isTraining || !userId) return

    try {
      const response = await fetch(`${N8N}/crm-historial-operador?operador_id=${userId}`)
      if (!response.ok) throw new Error('Error cargando estadísticas')
      
      const result = await response.json()
      if (result.ok) {
        setTrainingData(prev => ({
          ...prev,
          stats: result.resumen
        }))
      }
    } catch (error) {
      console.error('Error cargando estadísticas entrenamiento:', error)
      // No mostramos error para stats (no crítico)
    }
  }

  // Refrescar todos los datos de entrenamiento
  const refreshTrainingData = async () => {
    if (!isTraining || !userId) return

    setTrainingData(prev => ({ ...prev, loading: true }))
    
    try {
      const [leadsRes, statsRes] = await Promise.all([
        fetch(`${N8N}/crm-leads-entrenamiento?operador_id=${userId}`),
        fetch(`${N8N}/crm-historial-operador?operador_id=${userId}`)
      ])

      if (!leadsRes.ok) throw new Error('Error refrescando leads')
      if (!statsRes.ok) throw new Error('Error refrescando estadísticas')

      const [leadsData, statsData] = await Promise.all([
        leadsRes.json(),
        statsRes.json()
      ])

      setTrainingData(prev => ({
        ...prev,
        leads: leadsData.ok ? leadsData.leads || [] : [],
        stats: statsData.ok ? statsData.resumen : null,
        loading: false,
        error: null
      }))
    } catch (error) {
      console.error('Error refrescando datos entrenamiento:', error)
      setTrainingData(prev => ({
        ...prev,
        error: 'Error refrescando datos de entrenamiento',
        loading: false
      }))
      onError?.('Error refrescando datos de entrenamiento')
    }
  }

  // Clonar children con props adicionales
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        // Sobrescribir props del OperatorDashboard
        trainingLeads: trainingData.leads,
        trainingStats: trainingData.stats,
        sesionId: trainingData.sesionId,
        isTraining: true // Forzar modo training
      })
    }
    return child
  })

  // Banner de modo entrenamiento
  const TrainingBanner = () => (
    <div className="flex items-center justify-between px-4 py-2 bg-amber-900/20 border border-amber-800/30 rounded-sm mb-4">
      <div className="flex items-center gap-2">
        <GraduationCap size={14} className="text-amber-400 shrink-0" />
        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
          Modo simulación activa
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        {trainingData.error && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle size={12} />
            <span>{trainingData.error}</span>
          </div>
        )}
        
        <button
          onClick={refreshTrainingData}
          disabled={trainingData.loading}
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
        >
          <RefreshCw size={12} className={trainingData.loading ? 'animate-spin' : ''} />
          {trainingData.loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {isTraining && <TrainingBanner />}
      {childrenWithProps}
    </>
  )
}

export default TrainingModeWrapper