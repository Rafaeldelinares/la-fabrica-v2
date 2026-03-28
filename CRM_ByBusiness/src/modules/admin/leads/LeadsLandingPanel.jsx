import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import { Database, RefreshCw, Send, Target, Zap } from 'lucide-react';
import LeadLandingRow from './LeadLandingRow';

const PAGE_SIZE = 15;
const LANDING_ORIGIN = 'digital.ia-bybusiness.es';

/**
 * Panel de gestión de leads exclusivos de la Landing Page digital.ia-bybusiness.es
 * Enfocado en el diagnóstico IA y captación masiva.
 */
const LeadsLandingPanel = () => {
    const N8N = import.meta.env.VITE_N8N_URL;

    const [leads, setLeads]       = useState(null);
    const [total, setTotal]       = useState(0);
    const [gestores, setGestores] = useState([]);
    const [error, setError]       = useState('');
    const [pagina, setPagina]     = useState(1);

    const cargarGestores = useCallback(() => {
        fetch(`${N8N}/crm-usuarios-get`)
            .then(r => r.json())
            .then(d => { if (d.ok) setGestores(d.usuarios); })
            .catch(() => { setGestores([]); });
    }, [N8N]);

    const cargarLeads = useCallback(() => {
        setLeads(null);
        // Endpoint específico para leads de landing
        fetch(`${N8N}/crm-leads-landing-get`)
            .then(r => r.json())
            .then(data => {
                if (data.ok) { 
                    setLeads(data.leads); 
                    setTotal(data.total); 
                    setError(''); 
                } else { 
                    setLeads([]); 
                    setError('Error al cargar leads de landing'); 
                }
            })
            .catch(() => { setLeads([]); setError('Error de conexión con el servidor'); });
    }, [N8N]);

    useEffect(() => { cargarLeads(); cargarGestores(); }, [cargarLeads, cargarGestores]);

    const totalPaginas = Math.max(1, Math.ceil((leads?.length || 0) / PAGE_SIZE));
    const paginaReal   = Math.min(pagina, totalPaginas);
    const leadsPagina  = (leads || []).slice((paginaReal - 1) * PAGE_SIZE, paginaReal * PAGE_SIZE);

    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto p-6 bg-slate-950 font-sans">
            
            {/* Header Industrial */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Zap size={16} className="text-[#D00000]" /> LEADS DESDE LANDING
                        </h2>
                        <Badge className="bg-red-900/20 text-[#D00000] border-[#D00000]/30 animate-pulse">
                            ORIGEN: DIGITAL
                        </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                        Gestión prioritaria
                    </p>
                </div>

                <div className="flex gap-3 items-center">
                    <button
                        onClick={cargarLeads}
                        className="p-2 rounded-sm bg-slate-900 border border-slate-800 text-slate-400
                            hover:text-slate-200 hover:border-slate-700 transition-colors"
                        title="Recargar"
                    >
                        <RefreshCw size={13} />
                    </button>
                    <div className="h-8 w-px bg-slate-800 mx-2" />
                    <Badge className="bg-slate-800 text-slate-300 border-slate-700 font-mono">
                        {leads ? total : '—'} REGISTROS
                    </Badge>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-900/10 border border-blue-900/30 rounded-sm p-4 flex items-start gap-4">
                <Target className="text-blue-400 shrink-0 mt-0.5" size={16} />
                <div className="flex-1">
                    <p className="text-xs font-bold text-blue-100 uppercase tracking-tighter mb-1">Estatus de Campaña: Activa</p>
                    <p className="text-[10px] text-blue-300/70 leading-relaxed font-mono uppercase tracking-widest">
                        Todos los leads captados a través de {LANDING_ORIGIN} entran aquí de forma prioritaria.
                        La asignación automática está configurada para el perfil de Administrador.
                    </p>
                </div>
            </div>

            {/* Main Content Table */}
            <Card className="flex flex-col flex-1 bg-slate-900 border-slate-800 !p-0 overflow-hidden shadow-2xl">
                {leads === null ? (
                    <div className="space-y-2 p-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-slate-800 rounded-sm animate-pulse" />
                        ))}
                    </div>
                ) : leads.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <EmptyState title="Cero Captaciones" icon={Database} description="Aún no han entrado leads desde la nueva landing page." />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-400">
                                <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/80 border-b border-slate-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-5 py-4 font-mono">FECHA</th>
                                        <th className="px-5 py-4">NEGOCIO / CLIENTE</th>
                                        <th className="px-5 py-4">SECTOR</th>
                                        <th className="px-5 py-4 font-mono">POTENCIAL IA</th>
                                        <th className="px-5 py-4 font-mono">TELÉFONO</th>
                                        <th className="px-5 py-4">ESTADO</th>
                                        <th className="px-5 py-4">GESTOR</th>
                                        <th className="px-5 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leadsPagina.map(lead => (
                                        <LeadLandingRow key={lead.id} lead={lead} gestores={gestores} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPaginas > 1 && (
                            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 bg-slate-950/20">
                                <span className="text-[10px] text-slate-500 font-mono">
                                    EXPEDIENTE {paginaReal} DE {totalPaginas} — {total} CAPTACIONES TOTALES
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPagina(p => Math.max(1, p - 1))}
                                        disabled={paginaReal === 1}
                                        className="px-4 py-2 text-[10px] font-black uppercase rounded-sm bg-slate-800
                                            text-slate-400 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                                        disabled={paginaReal === totalPaginas}
                                        className="px-4 py-2 text-[10px] font-black uppercase rounded-sm bg-[#D00000]
                                            text-white hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {error && (
                <div className="fixed bottom-10 right-10 px-4 py-2 bg-red-900/50 border border-red-800 text-red-200 text-xs font-mono rounded-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
                   ⚠️ {error}
                </div>
            )}

        </div>
    );
};

export default LeadsLandingPanel;
