import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Target,
  Users,
  Plus,
  Search,
  TrendingUp,
  Phone,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit2,
  UserPlus,
  Zap,
  Trash2,
  GraduationCap,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import { useAuth } from '../../auth/AuthContext';
import CampanaDrawer from './CampanaDrawer';
import AsignarOperadoresModal from './AsignarOperadoresModal';
import GeneradorCampanasPanel from './GeneradorCampanasPanel';

const PAGE_SIZE = 10;
const N8N = import.meta.env.VITE_N8N_URL;

/**
 * CampanasPanel — Panel de gestión de campañas de llamadas.
 * Permite crear campañas, asignar operadores, y ver métricas de cumplimiento.
 * v2026.04.09 - Fix pantalla blanca
 */
const CampanasPanel = () => {
  const { user } = useAuth();
  const [campanas, setCampanas] = useState(null);
  const [operadores, setOperadores] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version] = useState('2026.04.09');
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState(''); // '' | 'real' | 'simulacion'
  const [filtroEstado, setFiltroEstado] = useState(''); // '' | 'activa' | 'inactiva' | 'pausada'
  const [busqueda, setBusqueda] = useState('');
  
  // Paginación
  const [pagina, setPagina] = useState(1);
  
  // Modales
  const [campanaSeleccionada, setCampanaSeleccionada] = useState(null);
  const [mostrarDrawer, setMostrarDrawer] = useState(false);
  const [mostrarAsignacion, setMostrarAsignacion] = useState(false);
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [modoCreacion, setModoCreacion] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [mostrarGenerador, setMostrarGenerador] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const mensajeTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mensajeTimeoutRef.current) {
        clearTimeout(mensajeTimeoutRef.current);
      }
    };
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError('');

    try {
      // Cargar campanas
      const campanasRes = await fetch(`${N8N}/crm-campanas`);
      if (!campanasRes.ok) throw new Error(`crm-campanas HTTP ${campanasRes.status}`);
      const campanasData = await campanasRes.json();

      if (Array.isArray(campanasData)) {
        setCampanas(campanasData);
      } else if (campanasData.ok && Array.isArray(campanasData.campanas)) {
        setCampanas(campanasData.campanas);
      } else {
        setCampanas([]);
      }

      // Cargar operadores
      const operadoresRes = await fetch(`${N8N}/crm-usuarios-get`);
      if (!operadoresRes.ok) throw new Error(`crm-usuarios-get HTTP ${operadoresRes.status}`);
      const operadoresData = await operadoresRes.json();

      if (operadoresData.ok) {
        setOperadores(operadoresData.usuarios.filter(u =>
          ['operador', 'en_practicas'].includes(u.rol)
        ));
      }

      // Cargar estadísticas por campaña
      await cargarEstadisticas();
    } catch (err) {
      setError(`Error al cargar datos — ${err.message}`);
      setCampanas([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const res = await fetch(`${N8N}/crm-estadisticas-campanas`);
      const data = await res.json();
      
      if (data.ok && Array.isArray(data.estadisticas)) {
        const statsMap = {};
        data.estadisticas.forEach(stat => {
          statsMap[stat.campana_id] = stat;
        });
        setEstadisticas(statsMap);
      }
    } catch {
      // estadísticas no críticas — el panel sigue funcionando sin ellas
    }
  };

  // Filtrar campanas
  const campanasFiltradas = useMemo(() => {
    if (!campanas) return [];
    
    return campanas.filter(c => {
      // Filtro por tipo (real vs simulación)
      if (filtroTipo === 'real' && c.es_simulacion) return false;
      if (filtroTipo === 'simulacion' && !c.es_simulacion) return false;
      
      // Filtro por estado (solo campo activo, estado fue eliminado en 9f3580d)
      if (filtroEstado === 'activa' && !c.activo) return false;
      if (filtroEstado === 'inactiva' && c.activo) return false;
      
      // Búsqueda
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (c.nombre || '').toLowerCase().includes(q) ||
               (c.descripcion || '').toLowerCase().includes(q);
      }
      
      return true;
    });
  }, [campanas, filtroTipo, filtroEstado, busqueda]);

  // Paginacion
  const totalPaginas = Math.max(1, Math.ceil(campanasFiltradas.length / PAGE_SIZE));
  const paginaReal = Math.min(pagina, totalPaginas);
  const campanasPagina = campanasFiltradas.slice(
    (paginaReal - 1) * PAGE_SIZE, 
    paginaReal * PAGE_SIZE
  );

  // Stats
  const stats = useMemo(() => {
    if (!campanas) return { total: 0, activas: 0, simulacion: 0 };
    
    return {
      total: campanas.length,
      activas: campanas.filter(c => c.activo).length,
      simulacion: campanas.filter(c => c.es_simulacion).length,
      reales: campanas.filter(c => !c.es_simulacion).length,
    };
  }, [campanas]);

  // Handlers
  const onCrearCampana = () => {
    setCampanaSeleccionada(null);
    setModoCreacion(true);
    setMostrarDrawer(true);
  };

  const onEditarCampana = (campana) => {
    setCampanaSeleccionada(campana);
    setModoCreacion(false);
    setMostrarDrawer(true);
  };

  const onAsignarOperadores = (campana) => {
    setCampanaSeleccionada(campana);
    setMostrarAsignacion(true);
  };

  const onEliminarCampana = (campana) => {
    setCampanaSeleccionada(campana);
    setMostrarEliminar(true);
  };

  const confirmarEliminar = async () => {
    if (!campanaSeleccionada) return;
    
    setEliminando(true);
    try {
      const res = await fetch(`${N8N}/crm-campanas-eliminar`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campanaSeleccionada.id })
      });
      
      const data = await res.json();
      
      if (data.ok) {
        await cargarDatos();
        setMostrarEliminar(false);
        setCampanaSeleccionada(null);
        setMensaje(data.message || 'Campana eliminada correctamente');
        if (mensajeTimeoutRef.current) clearTimeout(mensajeTimeoutRef.current);
        mensajeTimeoutRef.current = setTimeout(() => setMensaje(''), 3000);
      } else {
        setError(data.message || 'Error al eliminar campaña');
      }
    } catch (err) {
      setError('Error al eliminar — comprueba la conexión');
    } finally {
      setEliminando(false);
    }
  };

  const onGuardarCampana = async (datos) => {
    try {
      const url = modoCreacion 
        ? `${N8N}/crm-campanas-crear`
        : `${N8N}/crm-campana-update-fix`;
      
      const method = modoCreacion ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      
      const data = await res.json();
      
      if (data.ok || Array.isArray(data)) {
        await cargarDatos();
        setMostrarDrawer(false);
      } else {
        setError(data.message || 'Error al guardar campaña');
      }
    } catch (err) {
      setError('Error al guardar — comprueba la conexión');
    }
  };

  const selectCls = "bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase";
  const inputCls = "bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] w-full";

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-6 bg-slate-950 font-sans">
      
      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Mensaje de exito */}
      {mensaje && (
        <div className="px-3 py-2 bg-emerald-900/20 border border-emerald-900/30 rounded-sm text-[10px] text-emerald-400 font-mono">
          {mensaje}
        </div>
      )}

      {/* Header con stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 border-l-2 border-l-[#D00000]">
          <div className="flex items-center gap-3">
            <Target className="text-[#D00000]" size={20} />
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Total Campañas</p>
              <p className="text-xl font-bold text-white">{loading ? '—' : stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-l-2 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-emerald-500" size={20} />
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Activas</p>
              <p className="text-xl font-bold text-white">{loading ? '—' : stats.activas}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-l-2 border-l-blue-500">
          <div className="flex items-center gap-3">
            <Users className="text-blue-500" size={20} />
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Reales</p>
              <p className="text-xl font-bold text-white">{loading ? '—' : stats.reales}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-l-2 border-l-amber-500">
          <div className="flex items-center gap-3">
            <GraduationCap className="text-amber-500" size={20} />
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Entrenamiento</p>
              <p className="text-xl font-bold text-white">{loading ? '—' : stats.simulacion}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros y acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Gestion de Campanas</h2>
          <Badge className="bg-slate-800 text-slate-300 border-slate-700">
            {campanas ? `${campanasFiltradas.length} campanas` : '—'}
          </Badge>
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Buscar campana..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`${inputCls} pl-9 w-48`}
            />
          </div>
          
          <select 
            value={filtroTipo} 
            onChange={(e) => setFiltroTipo(e.target.value)} 
            className={selectCls}
          >
            <option value="">Tipo: Todos</option>
            <option value="real">Reales</option>
            <option value="simulacion">Entrenamiento</option>
          </select>
          
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className={selectCls}
          >
            <option value="">Estado: Todos</option>
            <option value="activa">Activa</option>
            <option value="inactiva">Inactiva</option>
          </select>

          <button
            onClick={() => setMostrarGenerador(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-sm bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-900/50 transition-colors"
          >
            <Zap size={12} /> Generador
          </button>

          <button
            onClick={onCrearCampana}
            className="flex items-center gap-2 px-4 py-2 bg-[#D00000] hover:bg-[#D00000]/80 text-white rounded-sm text-xs font-medium uppercase tracking-wider transition-colors"
          >
            <Plus size={14} />
            Nueva Campaña
          </button>
        </div>
      </div>

      {/* Tabla de campanas */}
      <Card className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-slate-500 font-mono text-xs">Cargando campanas...</div>
          </div>
        ) : campanasPagina.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Sin campanas"
            description={busqueda || filtroTipo || filtroEstado 
              ? "No hay campanas que coincidan con los filtros aplicados"
              : "Crea tu primera campana para comenzar"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Campaña</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leads</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Objetivos</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progreso</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operadores</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {campanasPagina.map(campana => {
                  const stats = estadisticas[campana.id] || {};
                  const ventasActuales = stats.ventas || 0;
                  const llamadasActuales = stats.llamadas || 0;
                  const progresoVentas = campana.objetivo_ventas > 0 
                    ? Math.round((ventasActuales / campana.objetivo_ventas) * 100) 
                    : 0;
                  const progresoLlamadas = campana.objetivo_llamadas > 0 
                    ? Math.round((llamadasActuales / campana.objetivo_llamadas) * 100) 
                    : 0;
                  
                  return (
                    <tr 
                      key={campana.id} 
                      className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{campana.nombre}</span>
                          {campana.descripcion && (
                            <span className="text-[10px] text-slate-500 truncate max-w-xs">
                              {campana.descripcion}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        {campana.es_simulacion ? (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                            <GraduationCap size={10} className="mr-1" />
                            Entrenamiento
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <Target size={10} className="mr-1" />
                            Real
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <LeadsCell stats={stats} campanaId={campana.id} />
                      </td>

                      <td className="px-4 py-3">
                        <CampanaEstadoBadge activo={campana.activo} />
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <div className="flex items-center gap-2 text-slate-400">
                            <DollarSign size={10} className="text-emerald-500" />
                            <span>{campana.bonus_por_venta || 0}€/venta</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Target size={10} className="text-[#D00000]" />
                            <span>{ventasActuales}/{campana.objetivo_ventas || 0} ventas</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Phone size={10} className="text-blue-500" />
                            <span>{llamadasActuales}/{campana.objetivo_llamadas || 0} llamadas</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <ProgresoBar 
                            label="Ventas" 
                            actual={ventasActuales} 
                            objetivo={campana.objetivo_ventas}
                            porcentaje={progresoVentas}
                            color="emerald"
                          />
                          <ProgresoBar 
                            label="Llamadas" 
                            actual={llamadasActuales} 
                            objetivo={campana.objetivo_llamadas}
                            porcentaje={progresoLlamadas}
                            color="blue"
                          />
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-500" />
                          <span className="text-sm text-slate-300">
                            {stats.num_operadores || campana.num_operadores || 0}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onAsignarOperadores(campana)}
                            className="p-2 rounded-sm hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Asignar operadores"
                          >
                            <UserPlus size={16} />
                          </button>
                          <button
                            onClick={() => onEditarCampana(campana)}
                            className="p-2 rounded-sm hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Editar campaña"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="p-2 rounded-sm hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Ver estadísticas"
                          >
                            <BarChart3 size={16} />
                          </button>
                          <button
                            onClick={() => onEliminarCampana(campana)}
                            className="p-2 rounded-sm hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                            title="Eliminar campaña"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Paginacion */}
        {!loading && campanasFiltradas.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono">
              Mostrando {((paginaReal - 1) * PAGE_SIZE) + 1} - {Math.min(paginaReal * PAGE_SIZE, campanasFiltradas.length)} de {campanasFiltradas.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={paginaReal === 1}
                className="p-2 rounded-sm bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-2 text-xs text-slate-300 font-mono">
                {paginaReal} / {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaReal === totalPaginas}
                className="p-2 rounded-sm bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Drawer de campana */}
      {mostrarDrawer && (
        <CampanaDrawer
          campana={campanaSeleccionada}
          modoCreacion={modoCreacion}
          onClose={() => setMostrarDrawer(false)}
          onSave={onGuardarCampana}
        />
      )}

      {/* Modal de asignación de operadores */}
      {mostrarAsignacion && campanaSeleccionada && (
        <AsignarOperadoresModal
          campana={campanaSeleccionada}
          operadores={operadores}
          onClose={() => setMostrarAsignacion(false)}
          onAsignar={cargarDatos}
        />
      )}

      {/* Modal del Generador de Campanas */}
      {mostrarGenerador && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <GeneradorCampanasPanel
              modoInicial="reales"
              onCerrar={() => { setMostrarGenerador(false); cargarDatos(); }}
            />
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {mostrarEliminar && campanaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-sm">
                <Trash2 className="text-red-500" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Eliminar Campana</h3>
                <p className="text-xs text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 mb-6">
              ¿Estás seguro de que quieres eliminar la campaña <strong className="text-white">"{campanaSeleccionada.nombre}"</strong>?
              <br /><br />
              <span className="text-xs text-slate-500">
                Los leads asignados a esta campaña quedarán libres y podrán ser reasignados.
              </span>
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setMostrarEliminar(false)}
                disabled={eliminando}
                className="px-4 py-2 rounded-sm bg-slate-800 text-slate-300 text-xs font-medium uppercase tracking-wider hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                disabled={eliminando}
                className="px-4 py-2 rounded-sm bg-red-600 text-white text-xs font-medium uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {eliminando ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={12} />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Celda de leads - muestra leads asignados y tasa de contacto
 */
const LeadsCell = ({ stats }) => {
  const leadsAsignados = stats?.leads_asignados || 0;
  const leadsContactados = stats?.leads_contactados || 0;
  const tasaContacto = leadsAsignados > 0 
    ? Math.round((leadsContactados / leadsAsignados) * 100) 
    : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Users size={12} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-300">
          {leadsAsignados.toLocaleString('es-ES')}
        </span>
      </div>
      {leadsAsignados > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Contactados</span>
            <span>{tasaContacto}%</span>
          </div>
          {/* CSS custom property: Tailwind no soporta anchos dinámicos de runtime */}
          <div className="h-1 w-20 bg-slate-800 rounded-full overflow-hidden">
            <div 
              style={{ '--w': `${Math.min(100, tasaContacto)}%` }}
              className={`h-full transition-all duration-500 [width:var(--w)] ${
                tasaContacto >= 70 ? 'bg-emerald-500' : 
                tasaContacto >= 40 ? 'bg-amber-500' : 'bg-[#D00000]'
              }`}
            />
          </div>
          <span className="text-[9px] text-slate-600">
            {leadsContactados}/{leadsAsignados}
          </span>
        </div>
      )}
    </div>
  );
};

LeadsCell.propTypes = {
  stats: PropTypes.shape({
    leads_asignados: PropTypes.number,
    leads_contactados: PropTypes.number,
  }),
};

/**
 * Badge de estado de campaña - SIMPLIFICADO: Solo usa 'activo'
 */
const CampanaEstadoBadge = ({ activo }) => {
  if (activo) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        Activa
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-slate-800 text-slate-500 border-slate-700 line-through">
      Inactiva
    </Badge>
  );
};

CampanaEstadoBadge.propTypes = {
  activo: PropTypes.bool,
};

/**
 * Barra de progreso para objetivos
 */
const ProgresoBar = ({ label, actual, objetivo, porcentaje, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    red: 'bg-[#D00000]',
    amber: 'bg-amber-500',
  };
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{label}</span>
        <span>{porcentaje}%</span>
      </div>
      {/* CSS custom property: Tailwind no soporta anchos dinámicos de runtime */}
      <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
        <div 
          style={{ '--w': `${Math.min(100, porcentaje)}%` }}
          className={`h-full ${colorClasses[color]} transition-all duration-500 [width:var(--w)]`}
        />
      </div>
    </div>
  );
};

ProgresoBar.propTypes = {
  label: PropTypes.string.isRequired,
  actual: PropTypes.number.isRequired,
  objetivo: PropTypes.number.isRequired,
  porcentaje: PropTypes.number.isRequired,
  color: PropTypes.oneOf(['emerald', 'blue', 'red', 'amber']).isRequired,
};

export default CampanasPanel;
