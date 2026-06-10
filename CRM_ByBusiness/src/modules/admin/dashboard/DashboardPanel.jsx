import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../shared/ui/Card';
import Stat from '../../../shared/ui/Stat';
import Badge from '../../../shared/ui/Badge';
import { RefreshCw } from 'lucide-react';

const PRIORIDAD_CLASSES = {
    alta:   'bg-red-500/10 text-red-500 border-red-500/20',
    normal: 'bg-slate-600/10 text-slate-300 border-slate-700/50',
    baja:   'bg-slate-800 text-slate-500 border-slate-700',
};

const AUTO_REFRESH_MS  = 300_000; // 5 minutos
const TICK_MS          = 60_000;  // 1 minuto

/**
 * DashboardPanel — Panel principal con KPIs, últimos leads, actividad de operadores
 * y auto-refresh cada 5 minutos. Consume crm-kpi-dashboard, crm-leads-admin y
 * crm-actividad-operadores vía n8n.
 *
 * Respuesta de los endpoints (n8n 2.12.2 con Respond to Webhook):
 *   GET crm-kpi-dashboard      → { ok: true, data: [ { total_leads, leads_hoy, leads_pendientes, leads_en_gestion, leads_convertidos, leads_descartados, prioridad_alta, prioridad_normal, prioridad_baja } ] }
 *   GET crm-leads-admin        → { ok: true, data: [ { id, nombre_comercial, telefono, email, localidad, estado, prioridad, ... } ] }
 *   GET crm-actividad-operadores → { ok: true, data: [ { nombre, id, llamadas_hoy, ventas_hoy, callbacks_hoy, tasa_hoy } ] }
 */
const DashboardPanel = () => {
    const N8N = import.meta.env.VITE_N8N_URL;

    const [kpis, setKpis]           = useState(null);
    const [leads, setLeads]         = useState([]);
    const [operadores, setOperadores] = useState([]);
    const [errorKpis, setErrorKpis]             = useState('');
    const [errorActividad, setErrorActividad]   = useState('');
    const [errorLeads, setErrorLeads]           = useState('');
    const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
    const [minutosSinRefresh, setMinutosSinRefresh]     = useState(0);

    const autoRefreshRef = useRef(null);
    const tickRef        = useRef(null);

    const cargarDatos = useCallback(() => {
        setErrorKpis('');
        setErrorActividad('');
        setErrorLeads('');

        fetch(`${N8N}/crm-kpi-dashboard`)
            .then(r => r.json())
            .then(d => {
                if (d.ok && Array.isArray(d.data) && d.data.length > 0) {
                    setKpis(d.data[0]);
                } else if (d.ok && d.data && !Array.isArray(d.data)) {
                    // Fallback: in case the data is a single object (e.g. future workflows)
                    setKpis(d.data);
                } else {
                    setErrorKpis('Error al cargar KPIs del dashboard');
                }
            })
            .catch(() => setErrorKpis('Error al cargar KPIs — comprueba la conexión'));

        fetch(`${N8N}/crm-leads-admin?limit=5`)
            .then(r => r.json())
            .then(d => {
                if (d.ok && Array.isArray(d.data)) {
                    setLeads(d.data);
                } else if (d.ok) {
                    setLeads([]);
                } else {
                    setErrorLeads('Error al cargar leads recientes');
                }
            })
            .catch(() => setErrorLeads('Error al cargar leads recientes'));

        fetch(`${N8N}/crm-actividad-operadores`)
            .then(r => r.json())
            .then(d => {
                if (d.ok && Array.isArray(d.data)) {
                    setOperadores(d.data);
                } else {
                    setErrorActividad('Error al cargar actividad de operadores');
                }
            })
            .catch(() => setErrorActividad('Error al cargar actividad — comprueba la conexión'));

        setUltimaActualizacion(new Date());
        setMinutosSinRefresh(0);
    }, [N8N]);

    /* Montaje: carga inicial + auto-refresh + tick contador */
    useEffect(() => {
        cargarDatos();

        autoRefreshRef.current = setInterval(cargarDatos, AUTO_REFRESH_MS);
        tickRef.current = setInterval(() => setMinutosSinRefresh(m => m + 1), TICK_MS);

        return () => {
            clearInterval(autoRefreshRef.current);
            clearInterval(tickRef.current);
        };
    }, [cargarDatos]);

    // Derivar totales de la lista de operadores (los contadores agregados
    // ya no vienen precomputados, hay que sumarlos en el cliente).
    const totalLlamadasHoy = operadores.reduce(
        (acc, op) => acc + (Number(op.llamadas_hoy) || 0), 0
    );
    const totalVentasHoy = operadores.reduce(
        (acc, op) => acc + (Number(op.ventas_hoy) || 0), 0
    );
    const totalCallbacksHoy = operadores.reduce(
        (acc, op) => acc + (Number(op.callbacks_hoy) || 0), 0
    );
    const tasa = totalLlamadasHoy > 0
        ? Math.round(100 * totalVentasHoy / totalLlamadasHoy)
        : 0;

    const horaActualizacion = ultimaActualizacion
        ? ultimaActualizacion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <div className="flex flex-col gap-6 h-full overflow-y-auto bg-slate-950 font-sans">

            {/* Cabecera con refresh */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">DASHBOARD</h2>
                    {horaActualizacion && (
                        <span className="text-[10px] text-slate-600 font-mono">
                            Actualizado {horaActualizacion}
                            {minutosSinRefresh > 0 && ` · hace ${minutosSinRefresh} min`}
                        </span>
                    )}
                </div>
                <button
                    onClick={cargarDatos}
                    className="p-2 rounded-sm bg-slate-900 border border-slate-800 text-slate-400
                        hover:text-slate-200 hover:border-slate-700 transition-colors"
                    title="Recargar datos"
                >
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* Error banners — seccionales, no colapsan el panel */}
            {errorKpis && (
                <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
                    {errorKpis}
                </div>
            )}
            {errorActividad && (
                <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
                    {errorActividad}
                </div>
            )}
            {errorLeads && (
                <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
                    {errorLeads}
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat
                    label="LEADS HOY"
                    value={kpis ? Number(kpis.leads_hoy ?? 0) : '—'}
                    trend={kpis ? `${Number(kpis.total_leads ?? 0)} total` : ''}
                />
                <Stat
                    label="LLAMADAS HOY"
                    value={totalLlamadasHoy}
                    trend={operadores.length > 0 ? `${operadores.length} ops` : ''}
                />
                <Stat
                    label="VENTAS HOY"
                    value={totalVentasHoy}
                    trend={kpis ? `${Number(kpis.leads_convertidos ?? 0)} convertidos` : ''}
                />
                <Stat
                    label="CONVERSIÓN"
                    value={`${tasa}%`}
                    trend="llamadas → venta"
                />
            </div>

            {/* Últimos leads + Actividad operadores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <Card className="flex flex-col bg-slate-900 border-slate-800 !p-5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">ÚLTIMOS LEADS</h3>
                    <div className="flex flex-col flex-1 gap-0">
                        {leads.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center py-6">
                                <p className="text-[10px] text-slate-700 font-mono uppercase tracking-widest italic">
                                    {errorLeads ? 'Error al cargar' : 'Sin leads recientes'}
                                </p>
                            </div>
                        ) : leads.map(lead => (
                            <div key={lead.id} className="flex justify-between items-center text-xs text-slate-200 border-b border-slate-800/50 py-2.5">
                                <span className="font-bold uppercase tracking-wide truncate pr-3">
                                    {lead.nombre_comercial || `Lead #${lead.id}`}
                                </span>
                                <div className="flex gap-2 items-center shrink-0">
                                    {lead.localidad && (
                                        <span className="text-[10px] text-slate-500 font-mono">{lead.localidad}</span>
                                    )}
                                    <Badge className={PRIORIDAD_CLASSES[lead.prioridad] || PRIORIDAD_CLASSES.normal}>
                                        {(lead.prioridad || '—').toUpperCase()}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="flex flex-col bg-slate-900 border-slate-800 !p-5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">ACTIVIDAD OPERADORES HOY</h3>
                    <div className="flex flex-col gap-0 flex-1">
                        {operadores.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center py-6">
                                <p className="text-[10px] text-slate-700 font-mono uppercase tracking-widest italic">
                                    {errorActividad ? 'Error al cargar' : 'Sin actividad hoy'}
                                </p>
                            </div>
                        ) : operadores.slice(0, 6).map(op => (
                            <div key={op.id} className="flex justify-between items-center py-2.5 border-b border-slate-800/50">
                                <span className="text-xs font-bold text-slate-200">{op.nombre}</span>
                                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                                    <span>{op.llamadas_hoy} llamadas</span>
                                    <span className="text-emerald-400 font-bold">{op.ventas_hoy} ventas</span>
                                    <span className="text-slate-600">{op.tasa_hoy}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

            </div>

            {/* Resumen rápido (captación + pendientes) — ahora con datos del KPI */}
            {kpis && (
                <Card className="bg-slate-900 border-slate-800 !p-5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">RESUMEN DE PIPELINE</h3>
                    <div className="flex items-center gap-8 flex-wrap">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Pendientes</span>
                            <span className="text-2xl font-black font-mono text-[#D00000]">
                                {Number(kpis.leads_pendientes ?? 0)}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">En gestión</span>
                            <span className="text-2xl font-black font-mono text-white">
                                {Number(kpis.leads_en_gestion ?? 0)}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Convertidos</span>
                            <span className="text-2xl font-black font-mono text-emerald-400">
                                {Number(kpis.leads_convertidos ?? 0)}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Descartados</span>
                            <span className="text-2xl font-black font-mono text-slate-500">
                                {Number(kpis.leads_descartados ?? 0)}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Prioridad alta</span>
                            <span className="text-2xl font-black font-mono text-amber-400">
                                {Number(kpis.prioridad_alta ?? 0)}
                            </span>
                        </div>
                    </div>
                </Card>
            )}

        </div>
    );
};

/** Panel autónomo — no recibe props externas */
DashboardPanel.propTypes = {};

export default DashboardPanel;
