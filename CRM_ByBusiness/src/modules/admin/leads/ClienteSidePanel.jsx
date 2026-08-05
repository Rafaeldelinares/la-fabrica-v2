import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { n8nGet, n8nPost } from '../../../shared/hooks/useN8n';
import ReputacionHistorial from './ReputacionHistorial';
import KeywordsPanel from '../seo/KeywordsPanel';

const FieldLabel = ({ children: labelText }) => <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">{labelText}</p>;
const FieldValue = ({ children: val }) => <p className="text-sm text-slate-200 font-mono mt-0.5 break-all">{val ?? '—'}</p>;

/** Groups reputacion + google maps link + seo keywords panel. */
const ClienteLeadExtra = ({ cliente }) => {
    const { data } = useQuery({
        queryKey: ['reputacion-historial', cliente.lead_id],
        queryFn: () => n8nPost('crm-lead-reputacion-historial', { lead_id: cliente.lead_id }),
        enabled: !!cliente?.lead_id, staleTime: 60_000,
    });
    const cid = data?.historial?.[0]?.google_cid;
    return (
        <>
            <ReputacionHistorial leadId={cliente.lead_id} />
            {cid && (
                <div className="mt-2">
                    <a href={`https://www.google.com/maps/place/?cid=${encodeURIComponent(cid)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-mono uppercase tracking-widest">
                        <ExternalLink size={10} /> Ver en Google Maps
                    </a>
                </div>
            )}
            {cliente.id && <KeywordsPanel clienteId={cliente.id} bybusinessUrl={cliente.bybusiness_url} />}
        </>
    );
};
ClienteLeadExtra.propTypes = { cliente: PropTypes.object.isRequired };

/**
 * ClienteSidePanel — Slide-in panel showing cliente details from crm-cartera-get.
 * @param {{ clienteId: number|string, onClose: Function }} props
 */
const ClienteSidePanel = ({ clienteId, onClose }) => {
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!clienteId) { setLoading(false); return; }
        setLoading(true);
        setError('');
        n8nGet(`crm-cartera-get?cliente_id=${clienteId}`)
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
                    <button onClick={onClose}
                        className="p-1.5 rounded-sm text-slate-600 hover:text-white hover:bg-slate-800 transition-colors">
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading && (
                        <div className="flex flex-col gap-2 px-5 py-6">
                            <div className="h-3 w-24 bg-slate-800 rounded-sm animate-pulse" />
                            <div className="h-3 w-32 bg-slate-800 rounded-sm animate-pulse" />
                            <div className="h-3 w-20 bg-slate-800 rounded-sm animate-pulse" />
                        </div>
                    )}
                    {error && !loading && (
                        <p className="px-5 pt-6 text-xs text-red-400 font-mono">{error}</p>
                    )}
                    {cliente && !loading && (
                        <div className="px-5 py-5 flex flex-col gap-4">
                            <div>
                                <FieldLabel>Nombre comercial</FieldLabel>
                                <p className="text-base font-black text-white uppercase tracking-wide mt-0.5">
                                    {cliente.nombre_comercial}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><FieldLabel>Telefono</FieldLabel><FieldValue>{cliente.telefono}</FieldValue></div>
                                <div><FieldLabel>Email</FieldLabel><FieldValue>{cliente.email}</FieldValue></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><FieldLabel>Gestor</FieldLabel><FieldValue>{cliente.gestor_nombre}</FieldValue></div>
                                <div><FieldLabel>Operador</FieldLabel><FieldValue>{cliente.operador_captacion_nombre || cliente.operador_captacion}</FieldValue></div>
                            </div>
                            <div>
                                <FieldLabel>Estado</FieldLabel>
                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-widest ${cliente.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{cliente.estado ?? '—'}</span>
                            </div>
                            {cliente.bybusiness_url && (
                                <div>
                                    <FieldLabel>ByBusiness URL</FieldLabel>
                                    <a href={cliente.bybusiness_url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-blue-400 font-mono mt-0.5 block hover:text-blue-300 underline break-all">
                                        {cliente.bybusiness_url}
                                    </a>
                                </div>
                            )}
                            {cliente.notas_internas && (
                                <div><FieldLabel>Notas internas</FieldLabel><p className="text-xs text-slate-400 font-mono mt-1 whitespace-pre-wrap leading-relaxed">{cliente.notas_internas}</p></div>
                            )}
                            <ClienteLeadExtra cliente={cliente} />
                            <div><FieldLabel>Fecha de alta</FieldLabel><FieldValue>{cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('es-ES') : null}</FieldValue></div>
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

FieldLabel.propTypes = { children: PropTypes.node.isRequired };
FieldValue.propTypes = { children: PropTypes.node.isRequired };
ClienteSidePanel.propTypes = {
    clienteId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    onClose: PropTypes.func.isRequired,
};

export default ClienteSidePanel;
