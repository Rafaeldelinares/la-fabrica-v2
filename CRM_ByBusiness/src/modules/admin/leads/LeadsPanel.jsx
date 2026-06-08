import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import { Users, RefreshCw, Zap, BarChart3, Brain } from 'lucide-react';
import LeadRow from './LeadRow';
import AsignameUnLead from './AsignameUnLead';
import GeneradorCampanasPanel from '../campanas/GeneradorCampanasPanel';
import CampanasAnalisisPanel from '../campanas/CampanasAnalisisPanel';
import AnalisisInteligentePanel from '../campanas/AnalisisInteligentePanel';
import { useAuth } from '../../auth/AuthContext';
import useTrainingScope from '../../../shared/hooks/useTrainingScope';

const PAGE_SIZE = 15;

/** Panel de gestion de leads: tabla filtrable, paginada, con acciones inline. */
const LeadsPanel = () => {
    const { user } = useAuth();
    const scope = useTrainingScope();
    const N8N = import.meta.env.VITE_N8N_URL;

    const [filtroEstado, setFiltroEstado]       = useState('');
    const [filtroPrioridad, setFiltroPrioridad] = useState('');
    const [filtroCampana, setFiltroCampana]     = useState('');
    const [leads, setLeads]                     = useState(null);
    const [total, setTotal]                     = useState(0);
    const [gestores, setGestores]               = useState([]);
    const [error, setError]                     = useState('');
    const [pagina, setPagina]                   = useState(1);
    const [mostrarGenerador, setMostrarGenerador] = useState(false);
    const [mostrarAnalisis, setMostrarAnalisis]   = useState(false);
    const [mostrarAnalisisInteligente, setMostrarAnalisisInteligente] = useState(false);
    const [filtrosGenerador, setFiltrosGenerador] = useState([]);
    const [datosAnalisis, setDatosAnalisis]       = useState(null);

    const cargarOperadores = useCallback(() => {
        fetch(`${N8N}/crm-operadores-activos`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => { if (data.ok) setGestores(data.operadores); })
            .catch(() => { setGestores([]); setError('Error al cargar gestores — comprueba la conexion'); });
    }, [N8N]);

    const cargarLeads = useCallback(() => {
        setLeads(null);
        fetch(`${N8N}/crm-leads-admin?es_simulacion=${scope.getFilterValue()}&limit=20000`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.ok) { setLeads(data.leads); setTotal(data.total); setError(''); }
                else { setLeads([]); setError('Error al cargar leads — respuesta inesperada del servidor'); }
            })
            .catch(() => { setLeads([]); setError('Error al cargar leads — comprueba la conexion'); });
    }, [N8N, scope]);

    useEffect(() => { cargarLeads(); cargarOperadores(); }, [cargarLeads, cargarOperadores]);

    const leadsFiltrados = (leads ?? []).filter(lead =>
        (!filtroEstado    || lead.estado    === filtroEstado) &&
        (!filtroPrioridad || lead.prioridad === filtroPrioridad) &&
        (!filtroCampana   || (filtroCampana === 'con' ? lead.campana_id : !lead.campana_id))
    );

    const totalPaginas = Math.max(1, Math.ceil(leadsFiltrados.length / PAGE_SIZE));
    const paginaReal   = Math.min(pagina, totalPaginas);
    const leadsPagina  = leadsFiltrados.slice((paginaReal - 1) * PAGE_SIZE, paginaReal * PAGE_SIZE);

    const onFiltroChange = (setter) => (e) => { setter(e.target.value); setPagina(1); };

    const selectCls = "bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase";

    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto p-6 bg-slate-950 font-sans">

            {error && (
                <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">GESTION DE LEADS</h2>
                    <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {leads ? total : '—'} LEADS
                    </Badge>
                </div>

                <div className="flex gap-3 items-center">
                    <button
                        onClick={() => setMostrarAnalisis(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-sm bg-blue-900/30 border border-blue-800 text-blue-400 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-900/50 transition-colors"
                    >
                        <BarChart3 size={12} /> ANALISIS
                    </button>
                    <button
                        onClick={() => setMostrarAnalisisInteligente(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-sm bg-violet-900/30 border border-violet-800 text-violet-400 text-[10px] font-bold uppercase tracking-wider hover:bg-violet-900/50 transition-colors"
                    >
                        <Brain size={12} /> ANALISIS-IA
                    </button>
                    <button
                        onClick={() => setMostrarGenerador(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-sm bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-900/50 transition-colors"
                    >
                        <Zap size={12} /> GENERADOR
                    </button>
                    <button
                        onClick={cargarLeads}
                        className="p-2 rounded-sm bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                        title="Recargar"
                    >
                        <RefreshCw size={13} />
                    </button>
                    <select value={filtroEstado} onChange={onFiltroChange(setFiltroEstado)} className={selectCls}>
                        <option value="">Estado: Todos</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="asignado">Asignado</option>
                        <option value="en_llamada">En Llamada</option>
                        <option value="vendido">Vendido</option>
                        <option value="no_interesa">No Interesa</option>
                        <option value="callback">Callback</option>
                        <option value="no_contesta">No Contesta</option>
                        <option value="error">Error</option>
                        <option value="lista_negra">Lista Negra</option>
                    </select>
                    <select value={filtroPrioridad} onChange={onFiltroChange(setFiltroPrioridad)} className={selectCls}>
                        <option value="">Prioridad: Todas</option>
                        <option value="alta">Alta</option>
                        <option value="normal">Normal</option>
                        <option value="baja">Baja</option>
                    </select>
                    <select value={filtroCampana} onChange={onFiltroChange(setFiltroCampana)} className={selectCls}>
                        <option value="">Campana: Todas</option>
                        <option value="con">Con campana</option>
                        <option value="sin">Sin campana</option>
                    </select>
                </div>
            </div>

            <AsignameUnLead onAssigned={cargarLeads} />

            {mostrarAnalisis && !mostrarGenerador && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-slate-950 border border-slate-800 rounded-sm">
                        <CampanasAnalisisPanel
                            onCrearCampana={(datos) => {
                                setDatosAnalisis(datos);
                                setFiltrosGenerador(datos.items || []);
                                setMostrarGenerador(true);
                            }}
                        />
                        <div className="absolute top-4 right-4">
                            <button
                                onClick={() => setMostrarAnalisis(false)}
                                className="px-3 py-1.5 rounded-sm bg-slate-800 text-slate-300 text-xs font-medium uppercase tracking-wider hover:bg-slate-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {mostrarGenerador && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden">
                        <GeneradorCampanasPanel
                            modoInicial="reales"
                            filtrosIniciales={filtrosGenerador}
                            onCerrar={() => {
                                setMostrarGenerador(false);
                                setFiltrosGenerador([]);
                                cargarLeads();
                            }}
                        />
                    </div>
                </div>
            )}

            {mostrarAnalisisInteligente && (
                <AnalisisInteligentePanel
                    onCerrar={() => { setMostrarAnalisisInteligente(false); cargarLeads(); }}
                    onAprobarPropuesta={() => cargarLeads()}
                />
            )}

            <Card className="flex flex-col flex-1 bg-slate-900 border-slate-800 !p-0 overflow-hidden">
                {leads === null ? (
                    <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
                        <div className="flex flex-col gap-3 items-center">
                            <div className="h-4 w-48 bg-slate-800 rounded-sm" />
                            <div className="h-3 w-32 bg-slate-800 rounded-sm" />
                        </div>
                    </div>
                ) : leadsFiltrados.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <EmptyState title="Sin leads" icon={Users} description="No hay leads con los filtros seleccionados" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-400">
                                <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 font-mono">ID</th>
                                        <th className="px-4 py-3">NEGOCIO</th>
                                        <th className="px-4 py-3 font-mono">TELEFONO</th>
                                        <th className="px-4 py-3">LOCALIDAD</th>
                                        <th className="px-4 py-3">PRIORIDAD</th>
                                        <th className="px-4 py-3">ESTADO</th>
                                        <th className="px-4 py-3">CAMPANA</th>
                                        <th className="px-4 py-3">OPERADOR</th>
                                        <th className="px-4 py-3 font-mono">SCORING</th>
                                        <th className="px-4 py-3 font-mono">FECHA</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leadsPagina.map(lead => (
                                        <LeadRow key={lead.id} lead={lead} gestores={gestores} isAdmin={user?.role === 'admin'} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPaginas > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                                <span className="text-[10px] text-slate-500 font-mono">
                                    Pagina {paginaReal} de {totalPaginas} — {leadsFiltrados.length} leads
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPagina(p => Math.max(1, p - 1))}
                                        disabled={paginaReal === 1}
                                        className="px-3 py-1.5 text-[10px] font-black uppercase rounded-sm bg-slate-800
                                            text-slate-400 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                                        disabled={paginaReal === totalPaginas}
                                        className="px-3 py-1.5 text-[10px] font-black uppercase rounded-sm bg-slate-800
                                            text-slate-400 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

        </div>
    );
};

export default LeadsPanel;
