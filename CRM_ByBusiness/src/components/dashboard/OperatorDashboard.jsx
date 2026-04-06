import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../modules/auth/AuthContext';
import useOperatorData from '../../hooks/useOperatorData';
import TrainingModeWrapper from './TrainingModeWrapper';
import OperatorErrorBoundary from './OperatorErrorBoundary';
import OperatorSkeleton from './OperatorSkeleton';
import Zone1Filters from './zones/Zone1Filters';
import Zone2Content from './zones/Zone2Content';
import Zone3Sidebar from './zones/Zone3Sidebar';

const N8N = import.meta.env.VITE_N8N_URL;

// Función no-op estable para modo training (evita recreación en cada render)
const noop = () => {};

/**
 * Dashboard principal del operador de llamadas.
 * Gestiona el flujo completo: asignación de lead, registro de resultado,
 * historial de trazabilidad y llamadas programadas.
 * Soporta modo simulación (en_practicas) con leads ficticios y seguimiento de progreso.
 * 
 * @param {Object} props - Props opcionales del TrainingModeWrapper
 * @param {Array} props.trainingLeads - Leads de entrenamiento (solo modo training)
 * @param {Object} props.trainingStats - Estadísticas de entrenamiento
 * @param {string} props.sesionId - ID de sesión de entrenamiento
 */
const OperatorDashboard = ({ 
  trainingLeads = [], 
  trainingStats = null, 
  sesionId = null 
}) => {
  const { user } = useAuth();
  const isTraining = user?.role === 'en_practicas';

  const [localidad, setLocalidad] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState('Todos');
  const [lead, setLead] = useState(null);
  const [llamadaId, setLlamadaId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [notas, setNotas] = useState('');
  const [sessionLeads, setSessionLeads] = useState([]);
  const [elapsedString, setElapsedString] = useState('00:00');
  const [errorRed, setErrorRed] = useState('');
  // Nuevos estados para Zone1Filters
  const [campanasActivas, setCampanasActivas] = useState([]);
  const [campanaSeleccionada, setCampanaSeleccionada] = useState(null);
  const [callbacksHoy, setCallbacksHoy] = useState([]);
  const [leadsDisponibles, setLeadsDisponibles] = useState(0);
  const [loadingCampanas, setLoadingCampanas] = useState(false);

  // Usar custom hook para data fetching consolidado (SOLO en modo real)
  // En modo training, los datos vienen del TrainingModeWrapper via cloneElement
  const operatorData = useOperatorData(user?.id, isTraining, lead?.id);
  const {
    programadas: realProgramadas,
    historial: realHistorial,
    loading: realDataLoading,
    error: realDataError,
    refreshData: realRefreshData,
  } = isTraining ? {} : operatorData;

  // En modo training, usar props del wrapper; en modo real, usar datos del hook
  const programadas = isTraining ? [] : realProgramadas;
  const historial = isTraining ? [] : realHistorial;
  const dataLoading = isTraining ? false : realDataLoading;
  const dataError = isTraining ? null : realDataError;
  const refreshData = isTraining ? noop : realRefreshData;

  // Cargar campañas activas y callbacks HOY (ambos modos: real y training)
  useEffect(() => {
    if (!user?.id) return;

    const cargarDatosZone1 = async () => {
      setLoadingCampanas(true);
      try {
        // Cargar campañas activas (endpoint LOCAL) - con es_simulacion según modo
        const campanasRes = await fetch(`${N8N}/crm-campanas-activas-local?operador_id=${user.id}&es_simulacion=${isTraining}`);
        if (campanasRes.ok) {
          const campanasData = await campanasRes.json();
          if (campanasData.ok) {
            setCampanasActivas(campanasData.campanas || []);
            // Auto-seleccionar primera campaña si hay
            if (campanasData.campanas?.length > 0 && !campanaSeleccionada) {
              setCampanaSeleccionada(campanasData.campanas[0].id);
            }
          }
        }

        // Cargar callbacks HOY (endpoint crm-callbacks-operador ya filtra por fecha)
        const callbacksRes = await fetch(`${N8N}/crm-callbacks-operador?operador_id=${user.id}&es_simulacion=${isTraining}`);
        if (callbacksRes.ok) {
          const callbacksData = await callbacksRes.json();
          if (callbacksData.ok) {
            // El endpoint ya devuelve callbacks_hoy filtrados
            setCallbacksHoy(callbacksData.callbacks_hoy || []);
          }
        }

        // Cargar leads disponibles (estimado) - endpoint simple
        try {
          const leadsRes = await fetch(`${N8N}/crm-leads-disponibles-simple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              es_simulacion: isTraining,
              campana_id: campanaSeleccionada // Filtrar por campaña si está seleccionada
            })
          });
          
          if (leadsRes.ok) {
            const leadsData = await leadsRes.json();
            if (leadsData.ok) {
              setLeadsDisponibles(leadsData.total_disponibles || 0);
            } else {
              // Fallback: estimar basado en campañas activas
              setLeadsDisponibles(campanasActivas.length * 10);
            }
          } else {
            // Fallback: estimar basado en campañas activas
            setLeadsDisponibles(campanasActivas.length * 10);
          }
        } catch (error) {
          console.error('Error cargando leads disponibles:', error);
          // Fallback: estimar basado en campañas activas
          setLeadsDisponibles(campanasActivas.length * 10);
        }
      } catch (error) {
        console.error('Error cargando datos Zone1:', error);
        // Fallback básico
        setLeadsDisponibles(campanasActivas.length * 10);
      } finally {
        setLoadingCampanas(false);
      }
    };

    cargarDatosZone1();
    // Refrescar cada 30 segundos
    const interval = setInterval(cargarDatosZone1, 30000);
    return () => clearInterval(interval);
    // Nota: campanasActivas no está en deps porque se actualiza dentro del efecto.
    // Agregarlo causaría bucle infinito. Usamos campanaSeleccionada como trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTraining, user?.id, campanaSeleccionada]);

  /**
   * Solicita el siguiente lead disponible de la cola y lo carga como lead activo.
   * En modo simulación selecciona el lead ficticio con menos intentos previos.
   * En modo real invoca el webhook crm-llamada-activa.
   */
  const handleAsignarLead = useCallback(async () => {
    if (isTraining) {
      const disponibles = trainingLeads.filter(l => !sessionLeads.find(s => s.id === l.id));
      if (!disponibles.length) return;
      const next = disponibles.sort((a, b) => (a.mis_intentos || 0) - (b.mis_intentos || 0))[0];
      setLead(next);
      setStartTime(Date.now());
      setNotas('');
      return;
    }
    try {
      const resp = await fetch(`${N8N}/crm-llamada-activa?operador_id=${user?.id}`);
      if (!resp.ok) { setErrorRed('Error del servidor al obtener lead.'); return; }
      const data = await resp.json();
      if (data?.ok && data.lead) {
        setLead(data.lead);
        setLlamadaId(data.llamada_id);
        setStartTime(Date.now());
        setNotas('');
      }
    } catch {
      setErrorRed("Error de red al obtener lead. Inténtalo de nuevo.");
    }
  }, [isTraining, trainingLeads, sessionLeads, user?.id]);

  const handleResultado = useCallback((resultado, detalles = {}) => {
    if (!resultado) return;

    if (isTraining) {
      // En modo training, siempre usar sesionId del wrapper (viene del servidor)
      // No usar trainingSesionId del hook que es un Date.now() local
      const sesionIdToUse = sesionId;
      if (!sesionIdToUse) {
        setErrorRed('Error: No hay sesión de entrenamiento activa');
        return;
      }
      fetch(`${N8N}/crm-resultado-entrenamiento`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ficticio_id: lead.id,
          operador_id: user?.id,
          sesion_id: sesionIdToUse,
          resultado, notas,
          duracion_seg: Math.floor((Date.now() - startTime) / 1000),
          ...detalles,
        }),
      })
        .then(async resp => {
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          if (!data?.ok) throw new Error(data?.message || 'Error del servidor');
          setSessionLeads(prev => [...prev, { ...lead, resultado }]);
          setLead(null); setNotas(''); setStartTime(null);
        })
        .catch(() => setErrorRed('Error de red al registrar resultado. Inténtalo de nuevo.'));
      return;
    }

    const payload = {
      operador_id: user?.id,
      lead_id: lead?.id,
      resultado,
      notas: notas || '',
      duracion: Math.floor((Date.now() - startTime) / 1000),
      ...detalles,
    };
    fetch(`${N8N}/crm-registrar-resultado`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data?.ok) throw new Error(data?.message || 'Error del servidor');
        setSessionLeads(prev => [...prev, { ...lead, resultado }]);
        setLead(null); setLlamadaId(null); setStartTime(null);
        setNotas('');
        refreshData();
      })
      .catch(() => setErrorRed('Error de red al registrar resultado. Inténtalo de nuevo.'));
  }, [isTraining, lead, user?.id, sesionId, startTime, notas, refreshData]);

  const handleEnviarInfo = useCallback((emailDestino, tipoInfo, nota) => {
    if (!emailDestino || !tipoInfo) {
      setErrorRed('Por favor completa email y tipo de información');
      return;
    }

    const cerrarPayload = {
      operador_id: user?.id,
      lead_id: lead?.id,
      resultado: 'enviar_info',
      notas: nota || `Email enviado a: ${emailDestino} (${tipoInfo})`,
      duracion: Math.floor((Date.now() - startTime) / 1000),
    };

    fetch(`${N8N}/crm-registrar-resultado`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cerrarPayload),
    })
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return fetch(`${N8N}/enviar-info`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: lead?.id, operador_id: user?.id, email_destino: emailDestino, tipo_info: tipoInfo }),
        });
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSessionLeads(prev => [...prev, { ...lead, resultado: 'enviar_info' }]);
          setLead(null); setLlamadaId(null); setStartTime(null);
          setNotas('');
          refreshData();
        } else {
          setErrorRed('Error al enviar email: ' + (data.message || 'Error desconocido'));
        }
      })
      .catch(err => setErrorRed('Error de red: ' + err.message));
  }, [lead, user?.id, startTime, refreshData]);

  // Funciones para Zone1Filters
  const handleSeleccionarCampana = useCallback((campanaId) => {
    setCampanaSeleccionada(campanaId);
    // Actualizar leads disponibles según campaña seleccionada
    // Esto se hará automáticamente en el próximo ciclo del useEffect
  }, []);

  const handleTomarCallback = useCallback(async (callback) => {
    try {
      // Usar el lead_id del callback para cargarlo directamente
      if (callback.lead_id) {
        // Obtener detalles del lead
        const leadRes = await fetch(`${N8N}/crm-lead-detail?lead_id=${callback.lead_id}`);
        if (leadRes.ok) {
          const leadData = await leadRes.json();
          if (leadData.ok && leadData.lead) {
            // Crear llamada activa para este lead
            const llamadaRes = await fetch(`${N8N}/crm-llamada-activa`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                operador_id: user?.id,
                lead_id: callback.lead_id,
                es_callback: true,
                llamada_programada_id: callback.id
              })
            });

            if (llamadaRes.ok) {
              const llamadaData = await llamadaRes.json();
              if (llamadaData.lead) {
                setLead(llamadaData.lead);
                setLlamadaId(llamadaData.llamada_id);
                setStartTime(Date.now());
                setNotas('');
                // Remover callback de la lista
                setCallbacksHoy(prev => prev.filter(cb => cb.id !== callback.id));
                return;
              }
            }
          }
        }
      }
      
      // Fallback: usar el endpoint normal de asignación
      setErrorRed('Tomando callback...');
      handleAsignarLead();
      // Remover callback de la lista después de un breve delay
      setTimeout(() => {
        setCallbacksHoy(prev => prev.filter(cb => cb.id !== callback.id));
        setErrorRed('');
      }, 1000);
    } catch (error) {
      console.error('Error tomando callback:', error);
      setErrorRed('Error al tomar callback. Usando asignación normal.');
      // Intentar asignación normal como fallback
      handleAsignarLead();
    }
  }, [user?.id, handleAsignarLead]);

  // Timer
  useEffect(() => {
    let interval;
    if (lead && startTime) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - startTime) / 1000);
        const minutos = Math.floor(diff / 60).toString().padStart(2, '0');
        const segundos = (diff % 60).toString().padStart(2, '0');
        setElapsedString(`⏱ ${minutos}:${segundos}`);
      }, 1000);
    } else {
      setElapsedString('00:00');
    }
    return () => clearInterval(interval);
  }, [lead, startTime]);

  useEffect(() => {
    if (dataError) setErrorRed(dataError);
  }, [dataError]);

  // Mostrar skeleton durante carga inicial
  if (dataLoading && !lead && sessionLeads.length === 0) {
    return <OperatorSkeleton />
  }

  // Renderizar contenido dentro del wrapper de training
  const dashboardContent = (
    <div className="flex flex-row h-full gap-4 p-4 bg-slate-950 font-sans">
      
      {/* Zona 1 - Filtros y gestión de sesión */}
      <Zone1Filters
        isTraining={isTraining}
        localidad={localidad}
        setLocalidad={setLocalidad}
        tipoNegocio={tipoNegocio}
        setTipoNegocio={setTipoNegocio}
        errorRed={errorRed}
        setErrorRed={setErrorRed}
        handleAsignarLead={handleAsignarLead}
        trainingLeads={trainingLeads}
        sessionLeads={sessionLeads}
        trainingLeadsDisponibles={trainingLeads.filter(l => !sessionLeads.find(s => s.id === l.id)).length}
        // Nuevos props para modo real
        callbacksHoy={callbacksHoy}
        campanasActivas={campanasActivas}
        leadsDisponibles={leadsDisponibles}
        onSeleccionarCampana={handleSeleccionarCampana}
        campanaSeleccionada={campanaSeleccionada}
        onTomarCallback={handleTomarCallback}
        loading={loadingCampanas}
      />

      {/* Zona 2 - Lead activo + acción */}
      <Zone2Content
        leadActivo={lead}
        llamadaActiva={llamadaId ? { id: llamadaId, inicio: startTime } : null}
        historialLlamadas={historial}
        isTraining={isTraining}
        notas={notas}
        setNotas={setNotas}
        elapsedString={elapsedString}
        onResultado={handleResultado}
        onEnviarInfo={handleEnviarInfo}
      />

      {/* Zona 3 - Sidebar (programadas + stats sesión) */}
      <Zone3Sidebar
        programadas={programadas}
        sessionLeads={sessionLeads}
        isTraining={isTraining}
        trainingStats={trainingStats}
        refreshData={refreshData}
      />
    </div>
  );

  // Envolver todo en Error Boundary
  const wrappedContent = (
    <OperatorErrorBoundary>
      {dashboardContent}
    </OperatorErrorBoundary>
  );

  // Si está en modo training, usar el wrapper adicional
  if (isTraining) {
    return (
      <TrainingModeWrapper 
        isTraining={isTraining}
        userId={user?.id}
        onError={setErrorRed}
      >
        {wrappedContent}
      </TrainingModeWrapper>
    );
  }

  // Modo normal
  return wrappedContent;
};

export default OperatorDashboard;
