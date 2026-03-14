import React, { useState, useEffect } from 'react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';

const LeadsPanel = () => {
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroPrioridad, setFiltroPrioridad] = useState('');
    const [leads, setLeads] = useState(null);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const N8N = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';
        fetch(`${N8N}/crm-leads-admin`)
            .then(r => r.json())
            .then(data => { if (data.ok) { setLeads(data.leads); setTotal(data.total); } })
            .catch(() => {});
    }, []);

    const leadsMock = [
        { id: 1, nombre: 'Ferretería López', telefono: '611000001', localidad: 'Málaga', prioridad: 'alta', estado: 'pendiente', scoring: 85, created_at: '2026-03-09' },
        { id: 2, nombre: 'Taller Mecánico Sur', telefono: '622000002', localidad: 'Marbella', prioridad: 'normal', estado: 'asignado', scoring: 72, created_at: '2026-03-08' },
        { id: 3, nombre: 'Clínica Dental Baza', telefono: '633000003', localidad: 'Granada', prioridad: 'alta', estado: 'en_llamada', scoring: 91, created_at: '2026-03-07' },
        { id: 4, nombre: 'Papelería Centro', telefono: '644000004', localidad: 'Sevilla', prioridad: 'baja', estado: 'vendido', scoring: 60, created_at: '2026-03-06' },
        { id: 5, nombre: 'Bar El Rincón', telefono: '655000005', localidad: 'Córdoba', prioridad: 'normal', estado: 'no_contesta', scoring: 45, created_at: '2026-03-05' },
    ];

    const getPrioridadClasses = (prioridad) => {
        switch (prioridad) {
            case 'alta': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'normal': return 'bg-slate-600/10 text-slate-300 border-slate-600/50';
            case 'baja': return 'bg-slate-800 text-slate-500 border-slate-700';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const getEstadoClasses = (estado) => {
        switch (estado) {
            case 'pendiente': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'asignado': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'vendido': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-slate-700/50 text-slate-400 border-slate-600';
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto p-6 bg-slate-950 font-sans">

            {/* Barra superior */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">GESTIÓN DE LEADS</h2>
                    <Badge className="bg-slate-800 text-slate-300 border-slate-700">{leads ? total : leadsMock.length} LEADS</Badge>
                </div>

                <div className="flex gap-3">
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase"
                    >
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

                    <select
                        value={filtroPrioridad}
                        onChange={(e) => setFiltroPrioridad(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase"
                    >
                        <option value="">Prioridad: Todas</option>
                        <option value="alta">Alta</option>
                        <option value="normal">Normal</option>
                        <option value="baja">Baja</option>
                    </select>
                </div>
            </div>

            {/* Tabla de Leads */}
            <Card className="flex flex-col flex-1 bg-slate-900 border-slate-800 !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-400">
                        <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 font-mono">ID</th>
                                <th className="px-4 py-3">NEGOCIO</th>
                                <th className="px-4 py-3 font-mono">TELÉFONO</th>
                                <th className="px-4 py-3">LOCALIDAD</th>
                                <th className="px-4 py-3">PRIORIDAD</th>
                                <th className="px-4 py-3">ESTADO</th>
                                <th className="px-4 py-3 font-mono">SCORING</th>
                                <th className="px-4 py-3 font-mono">FECHA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(leads ?? leadsMock).map((lead) => (
                                <tr key={lead.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                    <td className="px-4 py-4 font-mono text-slate-500">{lead.id.toString().padStart(4, '0')}</td>
                                    <td className="px-4 py-4 font-bold text-slate-200 uppercase tracking-wider">{lead.nombre_comercial || lead.nombre}</td>
                                    <td className="px-4 py-4 font-mono text-slate-300">{lead.telefono}</td>
                                    <td className="px-4 py-4 uppercase">{lead.localidad}</td>
                                    <td className="px-4 py-4">
                                        <Badge className={getPrioridadClasses(lead.prioridad)}>
                                            {lead.prioridad}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge className={getEstadoClasses(lead.estado)}>
                                            {lead.estado.replace('_', ' ')}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 font-mono">
                                        <span className="text-white font-bold">{lead.scoring}</span>
                                        <span className="text-slate-600">/100</span>
                                    </td>
                                    <td className="px-4 py-4 font-mono text-slate-500">{lead.created_at}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-800 flex justify-center bg-slate-950/30">
                    <p className="text-[9px] text-slate-700 italic uppercase tracking-widest">
            // Conectar a GET /webhook/crm-leads-admin — próxima versión
                    </p>
                </div>
            </Card>

        </div>
    );
};

export default LeadsPanel;
