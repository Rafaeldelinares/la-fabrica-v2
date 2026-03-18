import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Badge from '../../../shared/ui/Badge';
import { MessageSquare } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';

const ESTADOS = ['pendiente','asignado','en_llamada','vendido','no_interesa','callback','no_contesta','error','lista_negra'];

const getPrioridadClasses = (p) => {
    switch (p) {
        case 'alta':   return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'normal': return 'bg-slate-600/10 text-slate-300 border-slate-600/50';
        case 'baja':   return 'bg-slate-800 text-slate-500 border-slate-700';
        default:       return 'bg-slate-800 text-slate-400 border-slate-700';
    }
};

/**
 * LeadRow — Fila de lead con cambio de estado, asignación de gestor y nota rápida inline.
 * @param {object} props.lead - Datos del lead
 * @param {Array}  props.gestores - Lista de usuarios disponibles
 */
const LeadRow = ({ lead, gestores }) => {
    const N8N = import.meta.env.VITE_N8N_URL;

    const [estado, setEstado]           = useState(lead.estado);
    const [gestorId, setGestorId]       = useState(lead.operador_id ?? '');
    const [guardando, setGuardando]     = useState(false);
    const [errFila, setErrFila]         = useState('');
    const [notaAbierta, setNotaAbierta] = useState(false);
    const [nota, setNota]               = useState('');
    const [guardandoNota, setGuardandoNota] = useState(false);

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
            const data = await res.json();
            if (!data.ok) mostrarError('Error al guardar — intenta de nuevo');
        } catch {
            mostrarError('Error de conexión al guardar');
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
            const data = await res.json();
            if (data.ok) { setNota(''); setNotaAbierta(false); }
            else mostrarError('Error al guardar nota');
        } catch {
            mostrarError('Error de conexión al guardar nota');
        } finally {
            setGuardandoNota(false);
        }
    };

    const selectCls = `bg-slate-900 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-2 py-1
        outline-none focus:border-[#D00000] font-mono uppercase ${guardando ? 'opacity-50 cursor-not-allowed' : ''}`;

    return (
        <>
            <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3 font-mono text-slate-500">{lead.id.toString().padStart(4, '0')}</td>
                <td className="px-4 py-3 font-bold text-slate-200 uppercase tracking-wider">
                    {lead.nombre_comercial || lead.nombre}
                </td>
                <td className="px-4 py-3 font-mono text-slate-300">{lead.telefono}</td>
                <td className="px-4 py-3 uppercase text-slate-400">{lead.localidad}</td>
                <td className="px-4 py-3">
                    <Badge className={getPrioridadClasses(lead.prioridad)}>{lead.prioridad}</Badge>
                </td>
                <td className="px-4 py-3">
                    <select value={estado} onChange={onEstadoChange} disabled={guardando} className={selectCls}>
                        {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                    </select>
                </td>
                <td className="px-4 py-3">
                    <select value={gestorId} onChange={onGestorChange} disabled={guardando} className={selectCls}>
                        <option value="">— sin asignar</option>
                        {gestores.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                </td>
                <td className="px-4 py-3 font-mono">
                    <span className="text-white font-bold">{lead.scoring}</span>
                    <span className="text-slate-600">/100</span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-500">{fmtFecha(lead.created_at)}</td>
                <td className="px-4 py-3">
                    <button
                        onClick={() => setNotaAbierta(v => !v)}
                        className="p-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Nota rápida"
                    >
                        <MessageSquare size={13} />
                    </button>
                </td>
            </tr>
            {errFila && (
                <tr className="border-b border-slate-800/50">
                    <td colSpan={10} className="px-4 pb-1 pt-0">
                        <span className="text-[10px] text-red-400 font-mono">{errFila}</span>
                    </td>
                </tr>
            )}
            {notaAbierta && (
                <tr className="border-b border-slate-800/50 bg-slate-900/60">
                    <td colSpan={10} className="px-4 py-3">
                        <div className="flex gap-2 items-start">
                            <textarea
                                value={nota}
                                onChange={e => setNota(e.target.value)}
                                placeholder="Escribe una nota rápida..."
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
    }).isRequired,
    gestores: PropTypes.arrayOf(PropTypes.shape({
        id:     PropTypes.number.isRequired,
        nombre: PropTypes.string.isRequired,
    })).isRequired,
};

export default LeadRow;
