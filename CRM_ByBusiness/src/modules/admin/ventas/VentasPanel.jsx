import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import { TrendingUp, RefreshCw } from 'lucide-react';
import VentaRow from './VentaRow';

/** Devuelve YYYY-MM-DD de hace N días */
const fechaHace = (dias) => {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return d.toISOString().slice(0, 10);
};

/**
 * VentasPanel — Panel de relación de ventas con filtro de fechas, KPIs y cambio de estado inline.
 * Consume crm-ventas y crm-operadores-lista vía n8n.
 */
const VentasPanel = () => {
    const N8N = import.meta.env.VITE_N8N_URL;

    const [filtroEstado, setFiltroEstado]       = useState('');
    const [filtroOperador, setFiltroOperador]   = useState('');
    const [fechaDesde, setFechaDesde]           = useState(fechaHace(30));
    const [fechaHasta, setFechaHasta]           = useState(new Date().toISOString().slice(0, 10));
    const [ventas, setVentas]                   = useState(null);
    const [total, setTotal]                     = useState(0);
    const [operadores, setOperadores]           = useState([]);
    const [error, setError]                     = useState('');

    useEffect(() => {
        fetch(`${N8N}/crm-operadores-lista`)
            .then(r => r.json())
            .then(d => { if (d.ok) setOperadores(d.operadores); })
            .catch(() => setOperadores([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cargarVentas = useCallback(() => {
        setVentas(null);
        const params = new URLSearchParams();
        if (filtroEstado)    params.set('estado', filtroEstado);
        if (filtroOperador)  params.set('operador_id', filtroOperador);
        if (fechaDesde)      params.set('fecha_desde', fechaDesde);
        if (fechaHasta)      params.set('fecha_hasta', fechaHasta);
        fetch(`${N8N}/crm-ventas?${params}`)
            .then(r => r.json())
            .then(d => {
                if (d.ok) { setVentas(d.ventas); setTotal(d.total); setError(''); }
                else { setVentas([]); setError('Error al cargar ventas — respuesta inesperada del servidor'); }
            })
            .catch(() => { setVentas([]); setError('Error al cargar ventas — comprueba la conexión'); });
    }, [N8N, filtroEstado, filtroOperador, fechaDesde, fechaHasta]);

    useEffect(() => { cargarVentas(); }, [cargarVentas]);

    const onEstadoChange = (ventaId, nuevoEstado) => {
        setVentas(prev => prev.map(v => v.id === ventaId ? { ...v, estado: nuevoEstado } : v));
    };

    /* KPIs calculados del array local */
    const mrr = ventas
        ? ventas.filter(v => v.estado === 'activo').reduce((s, v) => s + (Number(v.total) || 0), 0)
        : 0;
    const tasaActivas = ventas && ventas.length > 0
        ? Math.round(100 * ventas.filter(v => v.estado === 'activo').length / ventas.length)
        : 0;

    const inputFechaCls = "bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono";
    const selectCls     = "bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase";

    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">

            {error && (
                <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
                    {error}
                </div>
            )}

            {/* KPI chips */}
            {ventas !== null && (
                <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
                        <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Total</span>
                        <span className="text-sm font-black font-mono text-white">{total}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
                        <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">MRR Activas</span>
                        <span className="text-sm font-black font-mono text-emerald-400">
                            {mrr > 0 ? `${mrr.toLocaleString('es-ES')} €` : '—'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
                        <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Tasa activas</span>
                        <span className="text-sm font-black font-mono text-white">{tasaActivas}%</span>
                    </div>
                </div>
            )}

            {/* Cabecera + filtros */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">RELACIÓN DE VENTAS</h2>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <button
                        onClick={cargarVentas}
                        className="p-2 rounded-sm bg-slate-900 border border-slate-800 text-slate-400
                            hover:text-slate-200 hover:border-slate-700 transition-colors"
                        title="Recargar"
                    >
                        <RefreshCw size={13} />
                    </button>
                    <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className={inputFechaCls} />
                    <span className="text-slate-600 text-xs">—</span>
                    <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className={inputFechaCls} />
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={selectCls}>
                        <option value="">Estado: Todos</option>
                        <option value="activo">Activo</option>
                        <option value="pausado">Pausado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                    <select value={filtroOperador} onChange={e => setFiltroOperador(e.target.value)} className={selectCls}>
                        <option value="">Operador: Todos</option>
                        {operadores.map(op => <option key={op.id} value={op.id}>{op.nombre}</option>)}
                    </select>
                </div>
            </div>

            <Card className="flex flex-col flex-1 bg-slate-900 border-slate-800 !p-0 overflow-hidden">
                {ventas === null ? (
                    <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
                        <div className="flex flex-col gap-3 items-center">
                            <div className="h-4 w-48 bg-slate-800 rounded-sm" />
                            <div className="h-3 w-32 bg-slate-800 rounded-sm" />
                        </div>
                    </div>
                ) : ventas.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <EmptyState title="Sin ventas registradas" icon={TrendingUp}
                            description="Las ventas cerradas por los operadores aparecerán aquí" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-400">
                            <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 font-mono">ID</th>
                                    <th className="px-4 py-3">CLIENTE</th>
                                    <th className="px-4 py-3 font-mono">TELÉFONO</th>
                                    <th className="px-4 py-3">LOCALIDAD</th>
                                    <th className="px-4 py-3">CATEGORÍA</th>
                                    <th className="px-4 py-3">OPERADOR</th>
                                    <th className="px-4 py-3 font-mono">SCORING</th>
                                    <th className="px-4 py-3">ESTADO</th>
                                    <th className="px-4 py-3 font-mono">FECHA VENTA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ventas.map(v => (
                                    <VentaRow key={v.id} venta={v} onEstadoChange={onEstadoChange} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

        </div>
    );
};

/** Panel autónomo — no recibe props externas */
VentasPanel.propTypes = {};

export default VentasPanel;
