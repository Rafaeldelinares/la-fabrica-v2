import React from 'react'

/**
 * Skeleton loading para OperatorDashboard
 * Muestra una representación esquelética de la UI de 3 zonas durante la carga
 * Mejora la percepción de velocidad y proporciona feedback visual
 */
const OperatorSkeleton = () => {
  return (
    <div className="flex flex-row h-full gap-4 p-4 bg-slate-950 font-sans animate-pulse">
      
      {/* ════════════ ZONA 1 (Sidebar izquierdo) ════════════ */}
      <div className="w-72 flex flex-col gap-3">
        {/* Filtros */}
        <div className="space-y-2">
          <div className="h-10 bg-slate-800 rounded-sm"></div>
          <div className="h-10 bg-slate-800 rounded-sm"></div>
        </div>
        
        {/* Botón asignar lead */}
        <div className="h-12 bg-slate-800 rounded-sm"></div>
        
        {/* Lista de gestiones */}
        <div className="flex-1 overflow-y-auto mt-2 flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-slate-900 rounded-sm border border-slate-800"></div>
          ))}
        </div>
      </div>

      {/* ════════════ ZONA 2 (Contenido principal) ════════════ */}
      <div className="flex-1 flex flex-row gap-4">
        <div className="flex-1 flex flex-col gap-4">
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-12 bg-slate-800 rounded-t-sm mx-1"></div>
            ))}
          </div>

          {/* Contenido del tab */}
          <div className="flex-1 bg-slate-900 rounded-sm p-6">
            {/* Header del lead */}
            <div className="space-y-4">
              <div className="h-8 bg-slate-800 rounded-sm w-3/4"></div>
              <div className="h-12 bg-slate-800 rounded-sm w-1/2"></div>
              <div className="flex gap-4">
                <div className="h-6 bg-slate-800 rounded-sm w-1/4"></div>
                <div className="h-6 bg-slate-800 rounded-sm w-1/4"></div>
              </div>
            </div>

            {/* Guión/llamada */}
            <div className="mt-8 space-y-3">
              <div className="h-4 bg-slate-800 rounded-sm w-full"></div>
              <div className="h-4 bg-slate-800 rounded-sm w-5/6"></div>
              <div className="h-4 bg-slate-800 rounded-sm w-4/6"></div>
            </div>

            {/* Opciones de resultado */}
            <div className="mt-8">
              <div className="h-4 bg-slate-800 rounded-sm w-1/3 mb-3"></div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className="h-10 bg-slate-800 rounded-sm"></div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="mt-8">
              <div className="h-24 bg-slate-800 rounded-sm"></div>
            </div>

            {/* Botón registrar */}
            <div className="mt-8 h-12 bg-slate-800 rounded-sm"></div>
          </div>
        </div>

        {/* ════════════ ZONA 3 (Sidebar derecho - Historial) ════════════ */}
        <div className="w-80 flex flex-col gap-2">
          {/* Título historial */}
          <div className="h-6 bg-slate-800 rounded-sm w-1/2"></div>
          
          {/* Items de historial */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-slate-900 rounded-sm border border-slate-800"></div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════ ZONA 4 (Sidebar derecho - Programadas/Progreso) ════════════ */}
      <div className="w-60 flex flex-col gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-sm">
        {/* Título */}
        <div className="h-6 bg-slate-800 rounded-sm w-2/3"></div>
        
        {/* Stats/Programadas */}
        <div className="flex-1 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-slate-800 rounded-sm"></div>
          ))}
        </div>
      </div>

    </div>
  )
}

/**
 * Skeleton compacto para cuando solo se está cargando data
 * (no toda la UI)
 */
export const OperatorDataSkeleton = () => {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 bg-slate-800 rounded-sm w-48"></div>
          <div className="h-4 bg-slate-800 rounded-sm w-64"></div>
        </div>
        <div className="h-10 bg-slate-800 rounded-sm w-32"></div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-slate-900 rounded-sm border border-slate-800"></div>
        ))}
      </div>

      {/* Tabla */}
      <div className="space-y-2">
        <div className="h-10 bg-slate-800 rounded-sm"></div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-slate-900 rounded-sm border border-slate-800"></div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton para cuando no hay lead activo
 */
export const OperatorNoLeadSkeleton = () => {
  return (
    <div className="flex flex-col items-center justify-center h-96 animate-pulse">
      <div className="w-64 h-64 bg-slate-900 rounded-full border border-slate-800"></div>
      <div className="mt-8 space-y-3 text-center">
        <div className="h-6 bg-slate-800 rounded-sm w-48 mx-auto"></div>
        <div className="h-4 bg-slate-800 rounded-sm w-64 mx-auto"></div>
        <div className="h-10 bg-slate-800 rounded-sm w-32 mx-auto mt-4"></div>
      </div>
    </div>
  )
}

export default OperatorSkeleton