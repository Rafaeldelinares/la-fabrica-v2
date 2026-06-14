import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Users, Clock, Calendar, Check, AlertTriangle } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import { n8nGet, n8nPost } from '../../../shared/hooks/useN8n';

const DIAS_SEMANA = [
  { id: 1, label: 'Lun', nombre: 'Lunes' },
  { id: 2, label: 'Mar', nombre: 'Martes' },
  { id: 3, label: 'Mié', nombre: 'Miércoles' },
  { id: 4, label: 'Jue', nombre: 'Jueves' },
  { id: 5, label: 'Vie', nombre: 'Viernes' },
  { id: 6, label: 'Sáb', nombre: 'Sábado' },
  { id: 0, label: 'Dom', nombre: 'Domingo' },
];

/**
 * AsignarOperadoresModal — Modal para asignar operadores a una campaña.
 */
const AsignarOperadoresModal = ({ campana, operadores, onClose, onAsignar }) => {
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar asignaciones existentes
  useEffect(() => {
    cargarAsignaciones();
  }, [campana.id, cargarAsignaciones]);

  const cargarAsignaciones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await n8nGet(`crm-campana-operadores?campana_id=${campana.id}`);

      if (data.ok && Array.isArray(data.asignaciones)) {
        setAsignaciones(data.asignaciones);
      } else {
        setAsignaciones([]);
      }
    } catch (err) {
      console.error('Error cargando asignaciones:', err);
      setAsignaciones([]);
    } finally {
      setLoading(false);
    }
  }, [campana.id]);

  const toggleOperador = (operadorId) => {
    setAsignaciones(prev => {
      const existe = prev.find(a => a.operador_id === operadorId);
      
      if (existe) {
        // Desasignar
        return prev.filter(a => a.operador_id !== operadorId);
      } else {
        // Asignar con valores por defecto
        return [...prev, {
          operador_id: operadorId,
          campana_id: campana.id,
          capacidad_diaria: 10,
          horario_inicio: '08:00',
          horario_fin: '20:00',
          dias_activos: [1, 2, 3, 4, 5], // Lunes a Viernes
          activo: true,
        }];
      }
    });
  };

  const updateAsignacion = (operadorId, field, value) => {
    setAsignaciones(prev => prev.map(a => {
      if (a.operador_id === operadorId) {
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  const toggleDia = (operadorId, diaId) => {
    setAsignaciones(prev => prev.map(a => {
      if (a.operador_id === operadorId) {
        const dias = a.dias_activos || [];
        const newDias = dias.includes(diaId)
          ? dias.filter(d => d !== diaId)
          : [...dias, diaId].sort();
        return { ...a, dias_activos: newDias };
      }
      return a;
    }));
  };

  const guardarAsignaciones = async () => {
    setGuardando(true);
    setError('');
    setSuccess('');

    try {
      const data = await n8nPost('crm-campana-asignar-operadores', {
        campana_id: campana.id,
        asignaciones: asignaciones.map(a => ({
          operador_id: a.operador_id,
          capacidad_diaria: a.capacidad_diaria || 10,
          horario_inicio: a.horario_inicio || '08:00',
          horario_fin: a.horario_fin || '20:00',
          dias_activos: a.dias_activos || [1, 2, 3, 4, 5],
          activo: true,
        })),
      });

      if (data.ok) {
        setSuccess('Asignaciones guardadas correctamente');
        onAsignar();
        setTimeout(() => onClose(), 1500);
      } else {
        setError(data.message || 'Error al guardar asignaciones');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar — comprueba la conexión';
      setError(msg.startsWith('HTTP') ? 'Error al guardar — comprueba la conexión' : msg);
    } finally {
      setGuardando(false);
    }
  };

  const isAsignado = (operadorId) => asignaciones.some(a => a.operador_id === operadorId);
  const getAsignacion = (operadorId) => asignaciones.find(a => a.operador_id === operadorId) || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 rounded-sm border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Users className="text-[#D00000]" size={20} />
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Asignar Operadores
              </h2>
              <p className="text-[10px] text-slate-500">
                {campana.nombre} • {campana.es_simulacion ? 'Entrenamiento' : 'Real'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-sm hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[11px] text-red-400 font-mono flex items-center gap-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 px-3 py-2 bg-emerald-900/20 border border-emerald-900/30 rounded-sm text-[11px] text-emerald-400 font-mono flex items-center gap-2">
              <Check size={14} />
              {success}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-slate-500 font-mono text-xs">Cargando operadores...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-sm border border-slate-800">
                <span className="text-xs text-slate-400">
                  {asignaciones.length} operador{asignaciones.length !== 1 ? 'es' : ''} asignado{asignaciones.length !== 1 ? 's' : ''}
                </span>
                <Badge className="bg-[#D00000]/10 text-[#D00000] border-[#D00000]/20">
                  Capacidad total: {asignaciones.reduce((sum, a) => sum + (a.capacidad_diaria || 10), 0)} llamadas/día
                </Badge>
              </div>

              {/* Lista de operadores */}
              <div className="space-y-3">
                {operadores.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Sin operadores disponibles"
                    description="No hay operadores registrados en el sistema"
                  />
                ) : (
                  operadores.map(operador => {
                    const asignado = isAsignado(operador.id);
                    const config = getAsignacion(operador.id);

                    return (
                      <Card
                        key={operador.id}
                        className={`p-4 transition-all ${asignado ? 'border-l-2 border-l-[#D00000]' : ''}`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox de asignación */}
                          <button
                            onClick={() => toggleOperador(operador.id)}
                            className={`mt-1 w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${
                              asignado
                                ? 'bg-[#D00000] border-[#D00000] text-white'
                                : 'border-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {asignado && <Check size={14} />}
                          </button>

                          {/* Info del operador */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-white">{operador.nombre}</span>
                              <Badge className={operador.rol === 'en_practicas' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}>
                                {operador.rol === 'en_practicas' ? 'En Prácticas' : 'Operador'}
                              </Badge>
                            </div>

                            {/* Configuración (solo si está asignado) */}
                            {asignado && (
                              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-800">
                                {/* Capacidad */}
                                <div>
                                  <label className="block text-[10px] text-slate-500 uppercase mb-1">
                                    Capacidad Diaria
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={config.capacidad_diaria || 10}
                                    onChange={(e) => updateAsignacion(operador.id, 'capacidad_diaria', parseInt(e.target.value) || 10)}
                                    className="w-20 bg-slate-900 border border-slate-800 rounded-sm px-2 py-1 text-sm text-slate-200 outline-none focus:border-[#D00000]"
                                  />
                                </div>

                                {/* Horario */}
                                <div>
                                  <label className="block text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1">
                                    <Clock size={10} /> Horario
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="time"
                                      value={config.horario_inicio || '08:00'}
                                      onChange={(e) => updateAsignacion(operador.id, 'horario_inicio', e.target.value)}
                                      className="w-20 bg-slate-900 border border-slate-800 rounded-sm px-2 py-1 text-xs text-slate-200 outline-none focus:border-[#D00000]"
                                    />
                                    <span className="text-slate-600">-</span>
                                    <input
                                      type="time"
                                      value={config.horario_fin || '20:00'}
                                      onChange={(e) => updateAsignacion(operador.id, 'horario_fin', e.target.value)}
                                      className="w-20 bg-slate-900 border border-slate-800 rounded-sm px-2 py-1 text-xs text-slate-200 outline-none focus:border-[#D00000]"
                                    />
                                  </div>
                                </div>

                                {/* Días */}
                                <div>
                                  <label className="block text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1">
                                    <Calendar size={10} /> Días Activos
                                  </label>
                                  <div className="flex gap-1">
                                    {DIAS_SEMANA.map(dia => {
                                      const activo = (config.dias_activos || []).includes(dia.id);
                                      return (
                                        <button
                                          key={dia.id}
                                          onClick={() => toggleDia(operador.id, dia.id)}
                                          className={`w-7 h-7 rounded-sm text-[10px] font-medium transition-colors ${
                                            activo
                                              ? 'bg-[#D00000] text-white'
                                              : 'bg-slate-900 border border-slate-800 text-slate-500 hover:border-slate-600'
                                          }`}
                                          title={dia.nombre}
                                        >
                                          {dia.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-sm text-xs font-medium uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardarAsignaciones}
            disabled={guardando || loading}
            className="px-4 py-2 bg-[#D00000] hover:bg-[#D00000]/80 text-white rounded-sm text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar Asignaciones'}
          </button>
        </div>
      </div>
    </div>
  );
};

AsignarOperadoresModal.propTypes = {
  campana: PropTypes.object.isRequired,
  operadores: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onAsignar: PropTypes.func.isRequired,
};

export default AsignarOperadoresModal;
