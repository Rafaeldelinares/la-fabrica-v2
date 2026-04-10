import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Brain, CheckCircle, XCircle, Users, Globe, Target, RefreshCw, AlertCircle, Sparkles, ChevronLeft, ChevronRight, MapPin, Layers, Filter } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';

const N8N = import.meta.env.VITE_N8N_URL;

const ITEMS_PER_PAGE = 10;

/**
 * Panel de Análisis Inteligente - Genera propuestas de campañas basadas en análisis de leads.
 * Soporta 3 tipos de propuestas: provincia, categoría (sector) y combo (nicho).
 * @param {Object} props
 * @param {Function} props.onCerrar - Callback al cerrar el panel
 * @param {Function} props.onAprobarPropuesta - Callback al aprobar una propuesta
 * @param {number} props.userId - ID del usuario actual
 */
const AnalisisInteligentePanel = ({ onCerrar, onAprobarPropuesta, userId }) => {
  const [propuestas, setPropuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumen, setResumen] = useState(null);
  const [incluirWeb, setIncluirWeb] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [propuestasAprobadas, setPropuestasAprobadas] = useState([]);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarAnalisis();
  }, [incluirWeb, filtroTipo]);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroTipo]);

  const cargarAnalisis = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${N8N}/crm-analisis-inteligente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_leads: 50,
          incluir_web: incluirWeb,
          tipo: filtroTipo
        })
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      if (data.success && Array.isArray(data.propuestas)) {
        setPropuestas(data.propuestas);
        setResumen(data.resumen);
      } else {
        setError('Respuesta inválida del servidor');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const aprobarPropuesta = async (propuesta) => {
    setCreando(true);
    try {
      const res = await fetch(`${N8N}/crm-crear-campana-con-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: propuesta.nombre,
          descripcion: propuesta.descripcion,
          es_simulacion: false,
          user_id: userId || 1,
          filtros: propuesta.filtros
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.ok) {
        setPropuestasAprobadas([...propuestasAprobadas, propuesta.id]);
        if (onAprobarPropuesta) onAprobarPropuesta(data);
      } else {
        alert(`Error: ${data.error || 'No se pudo crear'}`);
      }
    } catch (err) {
      alert(`Error al crear campaña: ${err.message}`);
    } finally {
      setCreando(false);
    }
  };

  // Paginación
  const totalPaginas = Math.ceil(propuestas.length / ITEMS_PER_PAGE);
  const propuestasPagina = propuestas.slice(
    (paginaActual - 1) * ITEMS_PER_PAGE,
    paginaActual * ITEMS_PER_PAGE
  );

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'ALTA': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'MEDIA': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 12) return 'text-emerald-400';
    if (score >= 8) return 'text-amber-400';
    return 'text-slate-400';
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'provincia': return <MapPin size={12} className="text-blue-400" />;
      case 'categoria': return <Filter size={12} className="text-amber-400" />;
      case 'combo': return <Layers size={12} className="text-violet-400" />;
      default: return null;
    }
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'provincia': return 'Provincia';
      case 'categoria': return 'Sector';
      case 'combo': return 'Nicho';
      default: return tipo;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-sm">
              <Brain className="text-violet-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Análisis Inteligente</h2>
              <p className="text-xs text-slate-500">
                {resumen?.total_propuestas || 0} propuestas generadas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filtro por tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-sm text-xs text-slate-300"
            >
              <option value="todos">Todos los tipos</option>
              <option value="provincia">Por Provincia</option>
              <option value="categoria">Por Sector</option>
              <option value="combo">Por Nicho (Provincia+Sector)</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirWeb}
                onChange={(e) => setIncluirWeb(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-violet-500"
              />
              <Globe size={12} />
              Factor Web
            </label>
            
            <button
              onClick={cargarAnalisis}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-sm bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Recalcular
            </button>
            
            <button
              onClick={onCerrar}
              className="p-2 rounded-sm hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        {/* Resumen */}
        {resumen && (
          <div className="grid grid-cols-5 gap-3 p-4 border-b border-slate-800 bg-slate-900/30">
            <div className="text-center">
              <div className="text-2xl font-black text-violet-400">{resumen.total_propuestas || 0}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-400">{resumen.propuestas_alta || 0}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Prioridad Alta</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-amber-400">{resumen.propuestas_media || 0}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Prioridad Media</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-blue-400">{propuestasAprobadas.length}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Aprobadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-slate-400">{totalPaginas}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Páginas</div>
            </div>
          </div>
        )}

        {/* Lista de propuestas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3 text-slate-500">
                <RefreshCw size={20} className="animate-spin" />
                <span className="text-sm">Analizando datos...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-400">
              <AlertCircle size={32} className="mb-2" />
              <p className="text-sm">{error}</p>
              <button onClick={cargarAnalisis} className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-sm hover:bg-slate-700">
                Reintentar
              </button>
            </div>
          ) : propuestas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Sparkles size={48} className="mb-4 opacity-30" />
              <p className="text-sm">No hay propuestas disponibles</p>
            </div>
          ) : (
            <>
              {propuestasPagina.map((propuesta, index) => (
                <div
                  key={propuesta.id || `propuesta-${index}`}
                  className={`p-4 rounded-sm border transition-all ${
                    propuestasAprobadas.includes(propuesta.id)
                      ? 'bg-emerald-900/10 border-emerald-800/30 opacity-60'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-bold text-white">{propuesta.nombre || 'Sin nombre'}</h3>
                        <Badge className={getPrioridadColor(propuesta.prioridad)}>
                          {propuesta.prioridad || 'BAJA'}
                        </Badge>
                        <Badge className="bg-slate-800 text-slate-400 border-slate-700 flex items-center gap-1">
                          {getTipoIcon(propuesta.tipo)}
                          {getTipoLabel(propuesta.categoria_tipo || propuesta.tipo)}
                        </Badge>
                        {propuestasAprobadas.includes(propuesta.id) && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <CheckCircle size={10} className="mr-1" />
                            Creada
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-400 mb-3">{propuesta.descripcion || ''}</p>
                      
                      <div className="flex items-center gap-6 mb-3">
                        <div className="flex items-center gap-2 text-xs">
                          <Users size={14} className="text-slate-500" />
                          <span className="text-slate-300">
                            {(propuesta.leads_estimados || 0).toLocaleString('es-ES')} leads
                          </span>
                        </div>
                        {(propuesta.leads_con_web || 0) > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <Globe size={14} className="text-blue-500" />
                            <span className="text-slate-300">
                              {(propuesta.leads_con_web || 0).toLocaleString('es-ES')} con web
                              {propuesta.pct_web > 0 && ` (${propuesta.pct_web}%)`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <Target size={14} className="text-violet-500" />
                          <span className={`font-bold ${getScoreColor(propuesta.score || 0)}`}>
                            Score: {propuesta.score || 0}
                          </span>
                        </div>
                      </div>
                      
                      {propuesta.razones && propuesta.razones.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {propuesta.razones.map((razon, idx) => (
                            <span key={idx} className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] rounded-sm">
                              {razon}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {!propuestasAprobadas.includes(propuesta.id) && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => aprobarPropuesta(propuesta)}
                          disabled={creando}
                          className="flex items-center gap-2 px-4 py-2 rounded-sm bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {creando ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Crear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-500">
                    Mostrando {((paginaActual - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(paginaActual * ITEMS_PER_PAGE, propuestas.length)} de {propuestas.length} propuestas
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-sm bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                      Anterior
                    </button>
                    <span className="text-xs text-slate-500 px-2">
                      Página {paginaActual} de {totalPaginas}
                    </span>
                    <button
                      onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                      className="flex items-center gap-1 px-3 py-2 rounded-sm bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Análisis basado en volumen, temporadas y presencia web
          </div>
          <button
            onClick={onCerrar}
            className="px-4 py-2 rounded-sm bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </Card>
    </div>
  );
};

AnalisisInteligentePanel.propTypes = {
  onCerrar: PropTypes.func.isRequired,
  onAprobarPropuesta: PropTypes.func,
  userId: PropTypes.number
};

export default AnalisisInteligentePanel;
