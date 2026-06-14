import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../shared/ui/Card';
import Stat from '../../../shared/ui/Stat';
import Badge from '../../../shared/ui/Badge';
import { RefreshCw } from 'lucide-react';
import useTrainingScope from '../../../shared/hooks/useTrainingScope';
import { n8nGet } from '../../../shared/hooks/useN8n';

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
 * Modelo de datos: el sistema trabaja con dos universos paralelos de leads/campañas
 * (real + training), diferenciados por el flag `es_simulacion`. El scope de cada
 * usuario determina qué ve:
 *   admin       → 'both'   (KPIs agregados de ambos universos)
 *   operador    → 'real'   (es_simulacion=false)
 *   en_practicas→ 'training' (es_simulacion=true)
 *
 * Respuesta de los endpoints (n8n 2.12.2 con Respond to Webhook):
 *   GET crm-kpi-dashboard      → { ok: true, data: [ { real: {...}, training: {...} } | {...} ] }
 *   GET crm-leads-admin        → { ok: true, data: [ { id, nombre_comercial, ... } ] }
 *   GET crm-actividad-operadores → { ok: true, data: [ { nombre, id, llamadas_hoy, ventas_hoy, callbacks_hoy, tasa_hoy } ] }
 */
const DashboardPanel = () => {
    const { mode, isAdmin, isTraining, getFilterValue } = useTrainingScope();

    const [kpis, setKpis]             = useState(null);
    const [leads, setLeads]           = useState([]);
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

        const scopeValue = getFilterValue();

        // KPIs: el admin recibe ambos universos (real+training), los demás solo el suyo
        n8nGet(`crm-kpi-dashboard?es_simulacion=${scopeValue}&mode=${mode}`)
            .then(d => {
                if (d.ok) {
                    // d.data es array de filas: para admin [{real:..., training:...}, {real:..., training:...}]
                    // para otros [ {total_leads, leads_hoy, ...} ]
                    setKpis(d.data);
                } else {
                    setErrorKpis('Error al cargar KPIs del dashboard');
                }
            })
            .catch(() => setErrorKpis('Error al cargar KPIs — comprueba la conexión'));

        // Leads recientes — siempre filtrados por scope
        n8nGet(`crm-leads-admin?es_simulacion=${scopeValue}&limit=5`)
            .then(d => {
                if (d.ok && Array.isArray(d.data)) {
                    setLeads(d.data);
                } else if (d.ok) {
                    setLeads([]);
                } else {
                    setErrorLeads(d.message || 'Error al cargar leads recientes');
                }
            })
            .catch(() => setErrorLeads('Error al cargar leads recientes'));

        // Actividad de operadores — filtrada por scope
        n8nGet(`crm-actividad-operadores?es_simulacion=${scopeValue}`)
            .then(d => {
                if (d.ok && Array.isArray(d.data)) {
                    setOperadores(d.data);
                } else {
                    setErrorActividad(d.message || 'Error al cargar actividad de operadores');
                }
            })
            .catch(() => setErrorActividad('Error al cargar actividad — comprueba la conexión'));

        setUltimaActualizacion(new Date());
        setMinutosSinRefresh(0);
    }, [mode, getFilterValue]);

    /* Montaje: carga inicial + auto-refresh + tick contador */
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        cargarDatos();
        autoRefreshRef.current = setInterval(cargarDatos, AUTO_REFRESH_MS);
        tickRef.current = setInterval(() => setMinutosSinRefresh(m => m + 1), TICK_MS);

        return () => {
            clearInterval(autoRefreshRef.current);
            clearInterval(tickRef.current);
        };
    }, [cargarDatos]);

    /* Derivar totales de la lista de operadores */
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

    /* Normalizar KPIs a un objeto {real, training, total} para render uniforme */
    const kpisNormalizados = (() => {
        if (!kpis) return null;

        // Admin mode: d.data es un array con dos filas (real + training)
        if (isAdmin && Array.isArray(kpis) && kpis.length > 0) {
            const byUniverse = kpis.reduce((acc, row) => {
                if (row.universe === 'real' || row.es_simulacion === false) acc.real = row;
                if (row.universe === 'training' || row.es_simulacion === true) acc.training = row;
                return acc;
            }, { real: null, training: null });
            return {
                real:     byUniverse.real     || kpis[0] || null,
                training: byUniverse.training || kpis[1] || null,
            };
        }

        // Real o training mode: d.data es un array con 1 fila
        const first = Array.isArray(kpis) ? kpis[0] : kpis;
        if (isTraining) return { real: null, training: first };
        return { real: first, training: null };
    })();

    const labelScope = isAdmin ? 'GLOBAL' : isTraining ? 'ENTRENAMIENTO' : 'REAL';

    return (
        <div className="flex flex-col gap-6 min-h-full overflow-y-auto bg-slate-950 font-sans">

            {/* Cabecera con refresh */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">DASHBOARD</h2>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm ${
                        isAdmin    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' :
                        isTraining ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                                     'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}>
                        {labelScope}
                    </span>
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

            {/* Error banners */}
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

            {/* KPIs — pueden venir como {real, training} o solo uno */}
            {kpisNormalizados && (() => {
                const cards = [];
                const pushCards = (row, suffix) => {
                    if (!row) return;
                    cards.push(
                        <Stat
                            key={suffix || 'main'}
                            label={`LEADS HOY${suffix ? ` (${suffix})` : ''}`}
                            value={Number(row.leads_hoy ?? 0)}
                            trend={row
                                ? `${Number(row.leads_hoy_contactables ?? 0)} contactables / ${Number(row.total_leads ?? 0)} total`
                                : ''}
                        />
                    );
                };
                pushCards(kpisNormalizados.real,     isAdmin ? 'REAL'     : null);
                pushCards(kpisNormalizados.training, isAdmin ? 'TRAINING' : null);

                // LLAMADAS HOY y VENTAS HOY — no vienen del KPI, los computamos de operadores
                cards.push(
                    <Stat
                        key="calls"
                        label="LLAMADAS HOY"
                        value={totalLlamadasHoy}
                        trend={operadores.length > 0 ? `${operadores.length} ops` : ''}
                    />
                );
                cards.push(
                    <Stat
                        key="sales"
                        label="VENTAS HOY"
                        value={totalVentasHoy}
                        trend=""
                    />
                );
                return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {cards}
                    </div>
                );
            })()}

            {/* Stats compactas — tasa de conversión + callbacks */}
            {operadores.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <Stat label="CONVERSIÓN" value={`${tasa}%`} trend="llamadas → venta" />
                    <Stat label="CALLBACKS HOY" value={totalCallbacksHoy} trend="por reasignar" />
                    <Stat label="OPS ACTIVOS" value={operadores.length} trend={isTraining ? 'en training' : 'reales'} />
                </div>
            )}

            {/* Últimos leads + Actividad operadores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <Card className="flex flex-col bg-slate-900 border-slate-800 !p-5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                        ÚLTIMOS LEADS {isTraining ? '(TRAINING)' : isAdmin ? '(AMBOS)' : '(REALES)'}
                    </h3>
                    <div className="flex flex-col flex-1 gap-0">
                        {leads.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center py-6">
                                <p className="text-[10px] text-slate-700 font-mono uppercase tracking-widest italic">
                                    {errorLeads ? 'Error al cargar' : 'Sin leads recientes'}
                                </p>
                            </div>
                        ) : leads.map(lead => (
                            <div key={lead.id} className="flex justify-between items-center text-xs text-slate-200 border-b border-slate-800/50 py-2.5">
                                <div className="flex items-center gap-2 min-w-0 pr-3">
                                    {isAdmin && (
                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm shrink-0 ${
                                            lead.es_simulacion
                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        }`}>
                                            {lead.es_simulacion ? 'TR' : 'RL'}
                                        </span>
                                    )}
                                    <span className="font-bold uppercase tracking-wide truncate">
                                        {lead.nombre_comercial || `Lead #${lead.id}`}
                                    </span>
                                </div>
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
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                        ACTIVIDAD OPERADORES HOY {isTraining ? '(TRAINING)' : isAdmin ? '(AMBOS)' : '(REALES)'}
                    </h3>
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

            {/* Resumen pipeline — solo si hay datos */}
            {(kpisNormalizados?.real || kpisNormalizados?.training) && (
                <Card className="bg-slate-900 border-slate-800 !p-5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                        RESUMEN DE PIPELINE {isAdmin ? '(POR UNIVERSO)' : ''}
                    </h3>
                    <div className="flex items-center gap-8 flex-wrap">
                        {[
                            { key: 'real',     label: 'REAL',     cls: 'emerald' },
                            { key: 'training', label: 'TRAINING', cls: 'amber' },
                        ].map(({ key, label, cls }) => {
                            const row = kpisNormalizados[key];
                            if (!row) return null;
                            const textClass = {
                                emerald: 'text-emerald-400',
                                amber:   'text-amber-400',
                            }[cls];
                            return (
                                <div key={key} className="flex flex-col gap-2 border-r border-slate-800/50 pr-8 last:border-r-0">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        {label}
                                    </span>
                                    <div className="flex gap-6 text-xs font-mono">
                                        <div className="flex flex-col">
                                            <span className="text-slate-600 text-[9px]">Pendientes</span>
                                            <span className="text-base font-bold text-white">
                                                {Number(row.leads_pendientes ?? 0)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-600 text-[9px]">Contactables</span>
                                            <span className="text-base font-bold text-emerald-400">
                                                {Number(row.leads_pendientes_contactables ?? 0)}
                                                <span className="text-slate-600 font-normal text-[9px]">
                                                    {' '}/{' '}{Number(row.leads_pendientes ?? 0)}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-600 text-[9px]">En gestión</span>
                                            <span className="text-base font-bold text-white">
                                                {Number(row.leads_en_gestion ?? 0)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-600 text-[9px]">Convertidos</span>
                                            <span className={`text-base font-bold ${textClass}`}>
                                                {Number(row.leads_convertidos ?? 0)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-600 text-[9px]">Descartados</span>
                                            <span className="text-base font-bold text-slate-500">
                                                {Number(row.leads_descartados ?? 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

        </div>
    );
};

/** Panel autónomo — no recibe props externas */
DashboardPanel.propTypes = {};

export default DashboardPanel;
