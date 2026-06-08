import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Badge from '../../../shared/ui/Badge';
import { MessageSquare, User } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';
import ClienteSidePanel from './ClienteSidePanel';

const ESTADOS = ['pendiente','asignado','en_llamada','vendido','no_interesa','callback','no_contesta','error','lista_negra'];

const getPrioridadClasses = (prioridad) => {
    switch (prioridad) {
        case 'alta':   return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'normal': return 'bg-slate-600/10 text-slate-300 border-slate-600/50';
        case 'baja':   return 'bg-slate-800 text-slate-500 border-slate-700';
        default:       return 'bg-slate-800 text-slate-400 border-slate-700';
    }
};

/**
 * LeadRow — Fila de lead con cambio de estado, asignacion de gestor y nota rapida inline.
 * @param {object}  props.lead     - Datos del lead
 * @param {Array}   props.gestores - Lista de usuarios disponibles
 * @param {boolean} props.isAdmin  - Si es admin, muestra boton Ver cliente en vendido
 */
const LeadRow = ({ lead, gestores, isAdmin }) => {
    const N8N = import.meta.env.VITE_N8N_URL;

    const [estado, setEstado]               = useState(lead.estado);
    const [gestorId, setGestorId]           = useState(lead.operador_id ?? '');
    const [guardando, setGuardando]         = useState(false);
    const [errFila, setErrFila]             = useState('');
    const [notaAbierta, setNotaAbierta]     = useState(false);
    const [nota, setNota]                   = useState('');
    const [guardandoNota, setGuardandoNota] = useState(false);
    const [panelClienteId, setPanelClienteId] = useState(null);

    const errTimerRef = useRef(null);

    useEffect(() => () => { if (errTimerRef.current) clearTimeout(errTimerRef.current); }, []);

    const mostrarError = (msg) => {
        setErrFila(msg);
        if (errTimerRef.current) clearTimeout(errTimerRef.current);
        errTimerRef.current = setTimeout(() => setErrFila(''), 3000);
    };

    const actualizarLead = async (campo, valor) => {
        setGuardando(true);
        try {
            const body = { id: lead.id, [campo]: valor };
            const res = await fetch(`${N8N}/crm-update-lead`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!data.ok) mostrarError('Error al guardar — intenta de nuevo');
        } catch {
            mostrarError('Error de conexion al guardar');
        } finally {
            setGuardando(false);
        }
    };

    const onEstadoChange = (e) => {
        setEstado(e.target.value);
        actualizarLead('estado', e.target.value);
    };

    const onGestorChange = (e) => {
        const val = e.target.value;
        setGestorId(val);
        actualizarLead('operador_id', val ? Number(val) : null);
    };

    const guardarNota = async () => {
        if (!nota.trim()) return;
        setGuardandoNota(true);
        try {
            const res = await fetch(`${N8N}/crm-lead-nota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: lead.id, nota: nota.trim() }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.ok) { setNota(''); setNotaAbierta(false); }
            else mostrarError('Error al guardar nota');
        } catch {
            mostrarError('Error de conexion al guardar nota');
        } finally {
            setGuardandoNota(false);
        }
    };

    const selectCls = `bg-slate-900 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-2 py-1
        outline-none focus:border-[#D00000] font-mono uppercase ${guardando ? 'opacity-50 cursor-not-allowed' : ''}`;

    const puedeVerCliente = isAdmin && lead.estado === 'vendido' && lead.cliente_id;

    return (
        <>
            <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3 font-mono text-slate-500">{lead.id.toString().padStart(4, '0')}</td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 uppercase tracking-wider">
                            {lead.nombre_comercial || lead.nombre}
                        </span>
                        {lead.is_pulso && (
                            <Badge className="bg-red-900/20 text-red-400 border-red-500/30">PULSO</Badge>
                        )}
                    </div>
                </td>
                <td className="px-4 py-3 font-mono text-slate-300">{lead.telefono}</td>
                <td className="px-4 py-3 uppercase text-slate-400">{lead.localidad}</td>
                <td className="px-4 py-3">
                    <Badge className={getPrioridadClasses(lead.prioridad)}>{lead.prioridad}</Badge>
                </td>
                <td className="px-4 py-3">
                    <select value={estado} onChange={onEstadoChange} disabled={guardando} className={selectCls}>
                        {ESTADOS.map(estadoOpt => <option key={estadoOpt} value={estadoOpt}>{estadoOpt.replace('_', ' ')}</option>)}
                    </select>
                </td>
                <td className="px-4 py-3">
                    {lead.campana_nombre ? (
                        <span className="text-[10px] text-emerald-400 font-mono truncate max-w-[100px] block" title={lead.campana_nombre}>
                            {lead.campana_nombre}
                        </span>
                    ) : (
                        <span className="text-[10px] text-slate-600 font-mono">— sin campaña</span>
                    )}
                </td>
                <td className="px-4 py-3">
                    <select value={gestorId} onChange={onGestorChange} disabled={guardando} className={selectCls}>
                        <option value="">— sin asignar</option>
                        {gestores.map(gestor => <option key={gestor.id} value={gestor.id}>{gestor.nombre}</option>)}
                    </select>
                </td>
                <td className="px-4 py-3 font-mono">
                    <span className="text-white font-bold">{lead.scoring}</span>
                    <span className="text-slate-600">/100</span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-500">{fmtFecha(lead.created_at)}</td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setNotaAbierta(v => !v)}
                            className="p-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Nota rapida"
                        >
                            <MessageSquare size={13} />
                        </button>
                        {puedeVerCliente && (
                            <button
                                onClick={() => setPanelClienteId(lead.cliente_id)}
                                className="p-1.5 rounded-sm bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-400 hover:text-blue-300 transition-colors"
                                title="Ver cliente"
                            >
                                <User size={13} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
            {errFila && (
                <tr className="border-b border-slate-800/50">
                    <td colSpan={11} className="px-4 pb-1 pt-0">
                        <span className="text-[10px] text-red-400 font-mono">{errFila}</span>
                    </td>
                </tr>
            )}
            {notaAbierta && (
                <tr className="border-b border-slate-800/50 bg-slate-900/60">
                    <td colSpan={11} className="px-4 py-3">
                        <div className="flex gap-2 items-start">
                            <textarea
                                value={nota}
                                onChange={e => setNota(e.target.value)}
                                placeholder="Escribe una nota rapida..."
                                rows={2}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-sm text-xs text-slate-200
                                    font-mono px-3 py-2 outline-none focus:border-[#D00000] resize-none"
                            />
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={guardarNota}
                                    disabled={guardandoNota || !nota.trim()}
                                    className="px-3 py-1.5 bg-[#D00000] text-white text-[10px] font-black uppercase
                                        rounded-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    {guardandoNota ? '...' : 'Guardar'}
                                </button>
                                <button
                                    onClick={() => { setNotaAbierta(false); setNota(''); }}
                                    className="px-3 py-1.5 bg-slate-800 text-slate-400 text-[10px] font-black uppercase
                                        rounded-sm hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
            {panelClienteId && (
                <ClienteSidePanel clienteId={panelClienteId} onClose={() => setPanelClienteId(null)} />
            )}
        </>
    );
};

LeadRow.propTypes = {
    lead: PropTypes.shape({
        id:              PropTypes.number.isRequired,
        nombre_comercial: PropTypes.string,
        nombre:          PropTypes.string,
        telefono:        PropTypes.string,
        localidad:       PropTypes.string,
        prioridad:       PropTypes.string,
        estado:          PropTypes.string,
        scoring:         PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        created_at:      PropTypes.string,
        operador_id:     PropTypes.number,
        is_pulso:       PropTypes.bool,
        cliente_id:     PropTypes.number,
    }).isRequired,
    gestores: PropTypes.arrayOf(PropTypes.shape({
        id:     PropTypes.number.isRequired,
        nombre: PropTypes.string.isRequired,
    })).isRequired,
    isAdmin: PropTypes.bool,
};

export default LeadRow;
