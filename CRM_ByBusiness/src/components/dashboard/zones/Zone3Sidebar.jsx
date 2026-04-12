import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import Stat from '../../../shared/ui/Stat';

/**
 * Zona 3 del dashboard de operador - Panel lateral derecho (FUTURO).
 * Muestra callbacks de hoy, compromisos futuros y estadísticas de sesión.
 * @param {Object} props
 * @param {Array} props.programadas - Llamadas programadas para futuro
 * @param {Array} props.sessionLeads - Leads gestionados en la sesión actual
 * @param {boolean} props.isTraining - Si está en modo entrenamiento
 * @param {Object} props.trainingStats - Estadísticas del modo entrenamiento
 * @param {Function} props.refreshData - Función para recargar datos
 * @param {Array} props.callbacksHoy - Callbacks programados para hoy
 * @param {Function} props.onTomarCallback - Handler al seleccionar un callback
 * @returns {JSX.Element}
 */
const Zone3Sidebar = ({
  programadas = [],
  sessionLeads = [],
  isTraining = false,
  trainingStats = null,
  refreshData,
  callbacksHoy = [],
  onTomarCallback
}) => {
  // Separar callbacks: HOY vs FUTURO
  const hoy = new Date().toISOString().split('T')[0];
  const callbacksDeHoy = callbacksHoy.filter(
    item => new Date(item.fecha_programada).toISOString().split('T')[0] === hoy
  );
  const compromisosFuturos = programadas.filter(
    item => new Date(item.fecha_programada).toISOString().split('T')[0] > hoy
  );
  const renderStats = () => {
    if (isTraining && trainingStats) {
      return (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Stat label="Clientes" value={trainingStats.totalLeads || 0} icon={CheckCircle} color="emerald" size="sm" />
          <Stat label="Completados" value={trainingStats.completedLeads || 0} icon={CheckCircle} color="blue" size="sm" />
          <Stat label="Ventas" value={trainingStats.ventas || 0} icon={CheckCircle} color="emerald" size="sm" />
          <Stat label="Callbacks" value={trainingStats.callbacks || 0} icon={Clock} color="amber" size="sm" />
        </div>
      );
    }

    const totalLlamadas = sessionLeads.length;
    const ventas = sessionLeads.filter(h => h.resultado === 'venta').length;
    const callbacks = sessionLeads.filter(h => h.resultado === 'callback').length;
    const enviarInfo = sessionLeads.filter(h => h.resultado === 'enviar_info').length;

    return (
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Stat label="Total" value={totalLlamadas} icon={CheckCircle} color="slate" size="sm" />
        <Stat label="Ventas" value={ventas} icon={CheckCircle} color="emerald" size="sm" />
        <Stat label="Callbacks" value={callbacks} icon={Clock} color="amber" size="sm" />
        <Stat label="Info" value={enviarInfo} icon={AlertCircle} color="blue" size="sm" />
      </div>
    );
  };

  const renderCompromisosFuturos = () => {
    if (compromisosFuturos.length === 0) {
      return (
        <div className="text-center py-4">
          <Clock size={20} className="mx-auto text-slate-700 mb-1" />
          <p className="text-xs text-slate-600">No hay compromisos futuros</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {compromisosFuturos.slice(0, 3).map((item, index) => (
          <Card key={index} className="!p-3 rounded-sm border-slate-800">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-bold text-white truncate pr-2">
                {item.nombre_comercial || 'Cliente'}
              </span>
              <Badge variant="outline" size="xs" className="bg-blue-900/20 text-blue-400 border-blue-800/30">
                {new Date(item.fecha_programada).toLocaleDateString('es-ES', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="font-mono">{item.telefono}</span>
              <span>·</span>
              <span className="truncate">{item.localidad || 'Sin localidad'}</span>
            </div>
            {item.notas && (
              <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">{item.notas}</p>
            )}
          </Card>
        ))}
        {compromisosFuturos.length > 3 && (
          <p className="text-[10px] text-slate-600 text-center">
            +{compromisosFuturos.length - 3} compromisos futuros
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
          {isTraining ? 'Estadísticas de Práctica' : 'Panel de Control'}
        </h3>
        <button
          onClick={refreshData}
          className="text-xs text-slate-500 hover:text-white transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      {renderStats()}

      {/* Callbacks HOY - Futuro inmediato */}
      {callbacksDeHoy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Callbacks HOY
            </h4>
            <span className="text-[10px] text-slate-600 font-mono ml-auto">
              {callbacksDeHoy.length}
            </span>
          </div>
          <div className="space-y-2">
            {callbacksDeHoy.slice(0, 5).map((callback, index) => (
              <Card key={index} className="!p-3 rounded-sm border-emerald-800/30 bg-emerald-900/10 cursor-pointer hover:bg-emerald-900/20 transition-colors"
                onClick={() => onTomarCallback && onTomarCallback(callback)}>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-emerald-300 truncate pr-2">
                    {callback.nombre_comercial || callback.lead_nombre || 'Cliente'}
                  </span>
                  <Badge variant="outline" size="xs" className="bg-emerald-900/30 text-emerald-400 border-emerald-800/30">
                    {new Date(callback.fecha_programada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                </div>
                {callback.nombre_responsable && (
                  <p className="text-[10px] text-emerald-400/70 truncate">
                    Contacto: {callback.nombre_responsable}
                  </p>
                )}
                {callback.notas && (
                  <p className="text-[10px] text-emerald-400/60 mt-1 line-clamp-2">
                    {callback.notas}
                  </p>
                )}
              </Card>
            ))}
            {callbacksDeHoy.length > 5 && (
              <p className="text-[10px] text-slate-600 text-center">
                +{callbacksDeHoy.length - 5} callbacks más
              </p>
            )}
          </div>
        </div>
      )}

      {/* Compromisos futuros */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-blue-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Próximos
          </h4>
          <span className="text-[10px] text-slate-600 font-mono ml-auto">
            {compromisosFuturos.length}
          </span>
        </div>
        {renderCompromisosFuturos()}
      </div>

      {/* Footer informativo */}
      <div className="pt-4 border-t border-slate-800">
        <p className="text-[9px] text-slate-600 text-center">
          {isTraining 
            ? 'Modo simulación · Los datos no se guardan permanentemente'
            : 'Datos en tiempo real · Actualización automática cada 30s'
          }
        </p>
      </div>
    </div>
  );
};

export default Zone3Sidebar;