import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Badge from '../../../shared/ui/Badge';
import { MessageSquare, Zap, Target, ExternalLink } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';

const ESTADOS = ['pendiente','asignado','en_llamada','vendido','no_interesa','callback','no_contesta','error','lista_negra'];
const LANDING_ORIGIN = 'digital.ia-bybusiness.es';

/**
 * Fila de lead proveniente de Landing Page con campos personalizados (Potencial IA, Sector).
 */
const LeadLandingRow = ({ lead, gestores }) => {
    const N8N = import.meta.env.VITE_N8N_URL;

    const [estado, setEstado]           = useState(lead.estado);
    const [gestorId, setGestorId]       = useState(lead.operador_id ?? '');
    const [guardando, setGuardando]     = useState(false);
    const [notaAbierta, setNotaAbierta] = useState(false);
    const [nota, setNota]               = useState('');
    const [guardandoNota, setGuardandoNota] = useState(false);
    const [errFila, setErrFila]         = useState('');

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
            const body = { lead_id: lead.id, [campo]: valor };
            const res = await fetch(`${N8N}/crm-update-lead`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!data.ok) mostrarError('Error al guardar');
        } catch {
            mostrarError('Error de conexión');
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

    const selectCls = `bg-slate-900 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-2 py-1
        outline-none focus:border-[#D00000] font-mono uppercase tracking-[0.05em] ${guardando ? 'opacity-50 cursor-not-allowed' : ''}`;

    /** Guarda una nota/observación en el historial del lead */
    const guardarNota = async () => {
        setGuardandoNota(true);
        try {
            const res = await fetch(`${N8N}/crm-update-lead`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: lead.id, nota }),
            });
            if (!res.ok) { mostrarError('Error al guardar nota'); return; }
            const data = await res.json();
            if (!data.ok) { mostrarError(data.error || 'Error al guardar nota'); return; }
        } catch {
            mostrarError('Error al guardar nota');
        } finally {
            setGuardandoNota(false);
        }
    };

    return (
        <React.Fragment>
            <tr className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors group">
                <td className="px-5 py-4 font-mono text-[10px] text-slate-500">{fmtFecha(lead.created_at)}</td>
                <td className="px-5 py-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-200 uppercase tracking-widest text-[11px]">
                            {lead.nombre_comercial || lead.nombre}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono italic">Origen: {LANDING_ORIGIN}</span>
                    </div>
                </td>
                <td className="px-5 py-4">
                    <Badge className="bg-slate-800 text-slate-300 border-slate-700 uppercase">{lead.sector || 'N/A'}</Badge>
                </td>
                <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Zap size={10} className="text-yellow-400" />
                        <span className="text-xs font-black text-white">{lead.potencial_ia || '0'}%</span>
                        <div className="h-1 w-12 bg-slate-800 rounded-full overflow-hidden hidden md:block">
                            {/* Excepción inline style: CSS custom property para valor dinámico de runtime */}
                            <div className="h-full bg-yellow-400 [width:var(--potencial-width)]" style={{ '--potencial-width': `${lead.potencial_ia || 0}%` }}></div>
                        </div>
                    </div>
                </td>
                <td className="px-5 py-4 font-mono text-slate-300">
                    <div className="flex items-center gap-2">
                        <span>{lead.telefono}</span>
                        <button className="text-slate-600 hover:text-emerald-400 transition-colors">
                            <ExternalLink size={10} />
                        </button>
                    </div>
                </td>
                <td className="px-5 py-4">
                    <select value={estado} onChange={onEstadoChange} disabled={guardando} className={selectCls}>
                        {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                    </select>
                </td>
                <td className="px-5 py-4">
                    <select value={gestorId} onChange={onGestorChange} disabled={guardando} className={selectCls}>
                        <option value="">— sin asignar</option>
                        {gestores.map(g => (
                            <option key={g.id} value={g.id}>{g.nombre}</option>
                        ))}
                    </select>
                </td>
                <td className="px-5 py-4">
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setNotaAbierta(!notaAbierta)}
                            className={`p-1.5 rounded-sm transition-colors ${notaAbierta ? 'bg-[#D00000] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <MessageSquare size={12} />
                        </button>
                    </div>
                </td>
            </tr>
            
            {errFila && (
                <tr className="bg-red-950/20">
                    <td colSpan={10} className="px-5 py-1 text-center font-mono text-[9px] text-red-400">{errFila}</td>
                </tr>
            )}

            {notaAbierta && (
                <tr className="bg-slate-900 border-b border-slate-800 animate-in fade-in slide-in-from-top-1">
                    <td colSpan={10} className="px-5 py-4">
                        <div className="flex flex-col gap-3 max-w-2xl">
                             <p className="text-[9px] font-black uppercase tracking-widest text-[#D00000]">Historial / Observaciones</p>
                             <textarea 
                                value={nota}
                                onChange={e => setNota(e.target.value)}
                                placeholder="Escribe aquí notas adicionales del lead..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-sm text-xs text-white p-3 font-mono outline-none focus:border-[#D00000] resize-none"
                                rows={3}
                             />
                             <div className="flex gap-2">
                                <button
                                    onClick={guardarNota}
                                    disabled={guardandoNota}
                                    className="px-4 py-1.5 bg-[#D00000] text-white text-[10px] font-black uppercase rounded-sm disabled:opacity-50"
                                >{guardandoNota ? '…' : 'Guardar Nota'}</button>
                                <button onClick={() => setNotaAbierta(false)} className="px-4 py-1.5 bg-slate-800 text-slate-400 text-[10px] font-black uppercase rounded-sm">Cerrar</button>
                             </div>
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );
};

LeadLandingRow.propTypes = {
    lead: PropTypes.shape({
        id:               PropTypes.number.isRequired,
        nombre:           PropTypes.string,
        nombre_comercial: PropTypes.string,
        sector:           PropTypes.string,
        potencial_ia:     PropTypes.number,
        telefono:         PropTypes.string,
        estado:           PropTypes.string,
        operador_id:      PropTypes.number,
        created_at:       PropTypes.string,
    }).isRequired,
    gestores: PropTypes.arrayOf(PropTypes.shape({
        id:     PropTypes.number.isRequired,
        nombre: PropTypes.string.isRequired,
    })).isRequired,
};

export default LeadLandingRow;
