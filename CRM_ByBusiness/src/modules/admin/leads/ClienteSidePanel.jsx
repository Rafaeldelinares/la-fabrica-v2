import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, ExternalLink, Loader } from 'lucide-react';

const N8N = import.meta.env.VITE_N8N_URL;

const L = (t) => <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">{t}</p>;
const V = (v) => <p className="text-sm text-slate-200 font-mono mt-0.5 break-all">{v ?? '—'}</p>;

/**
 * ClienteSidePanel — Slide-in panel showing cliente details from crm-cartera-get.
 * Navy Industrial style, max 150 lines.
 * @param {{ clienteId: number|string, onClose: Function }} props
 */
const ClienteSidePanel = ({ clienteId, onClose }) => {
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading]  = useState(true);
    const [error, setError]     = useState('');

    useEffect(() => {
        if (!clienteId) { setLoading(false); return; }
        setLoading(true);
        setError('');
        fetch(`${N8N}/crm-cartera-get?cliente_id=${clienteId}`)
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
            .then(data => {
                if (data.ok && data.clientes?.length) setCliente(data.clientes[0]);
                else setError('Cliente no encontrado');
            })
            .catch(() => setError('Error al cargar datos'))
            .finally(() => setLoading(false));
    }, [clienteId]);

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                    <p className="text-xs font-black text-white uppercase tracking-widest">
                        {cliente ? 'FICHA DE CLIENTE' : 'CLIENTE'}
                    </p>
                    <button onClick={onClose} className="p-1.5 rounded-sm text-slate-600 hover:text-white hover:bg-slate-800 transition-colors">
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading && (
                        <div className="flex items-center justify-center h-32 gap-2">
                            <Loader size={14} className="text-slate-500 animate-spin" />
                            <p className="text-xs text-slate-500 font-mono">Cargando…</p>
                        </div>
                    )}
                    {error && !loading && (
                        <p className="px-5 pt-6 text-xs text-red-400 font-mono">{error}</p>
                    )}
                    {cliente && !loading && (
                        <div className="px-5 py-5 flex flex-col gap-4">
                            <div>
                                <L>Nombre comercial</L>
                                <p className="text-base font-black text-white uppercase tracking-wide mt-0.5">{cliente.nombre_comercial}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><L>Telefono</L>{V(cliente.telefono)}</div>
                                <div><L>Email</L>{V(cliente.email)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><L>Gestor</L>{V(cliente.gestor_nombre)}</div>
                                <div><L>Operador</L>{V(cliente.operador_captacion_nombre || cliente.operador_captacion)}</div>
                            </div>
                            <div>
                                <L>Estado</L>
                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-widest ${
                                    cliente.estado === 'activo'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                    {cliente.estado ?? '—'}
                                </span>
                            </div>
                            {cliente.bybusiness_url && (
                                <div><L>ByBusiness URL</L>
                                    <a href={cliente.bybusiness_url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-blue-400 font-mono mt-0.5 block hover:text-blue-300 underline break-all">
                                        {cliente.bybusiness_url}
                                    </a>
                                </div>
                            )}
                            {cliente.notas_internas && (
                                <div><L>Notas internas</L>
                                    <p className="text-xs text-slate-400 font-mono mt-1 whitespace-pre-wrap leading-relaxed">{cliente.notas_internas}</p>
                                </div>
                            )}
                            <div><L>Fecha de alta</L>{V(cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('es-ES') : null)}</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-800 shrink-0">
                    <a href="/admin/cartera" target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-bold uppercase tracking-widest rounded-sm transition-colors">
                        <ExternalLink size={12} /> Ver ficha completa
                    </a>
                </div>
            </div>
        </div>
    );
};

ClienteSidePanel.propTypes = {
    clienteId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    onClose:   PropTypes.func.isRequired,
};

export default ClienteSidePanel;
