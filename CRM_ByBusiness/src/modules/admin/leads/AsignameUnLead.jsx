/**
 * AsignameUnLead — botón para que el operador tome exactamente 1 lead.
 *
 * POST a `crm-distribuidor-huerfanos` → lead sin campaña
 * POST a `crm-distribuidor-campanas?campana_id=X` → lead de campaña activa
 *
 * Body: { operator_id, mode: "one" }
 *
 * @param {object}   props
 * @param {Function} props.onAssigned — callback (newLead) invoked tras asignación exitosa
 */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../auth/AuthContext';
import useTrainingScope from '../../../shared/hooks/useTrainingScope';

const N8N = import.meta.env.VITE_N8N_URL;

const AsignameUnLead = ({ onAssigned }) => {
    const { user } = useAuth();
    const scope = useTrainingScope();

    const [campaigns, setCampaigns]     = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError] = useState('');
    const [loadingBtn, setLoadingBtn] = useState(null); // null | 'orphan' | campana_id

    const fetchCampaigns = useCallback(() => {
        const es_sim = scope.getFilterValue();
        const param = es_sim === 'both' ? '' : `?es_simulacion=${es_sim}`;
        return fetch(`${N8N}/crm-campanas${param}`)
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
            .then(data => {
                if (data.ok) {
                    // Filter to active campaigns only (activo=true)
                    setCampaigns((data.campanas || []).filter(c => c.activo === true));
                }
            })
            .catch(() => setError('Error al cargar campañas'))
            .finally(() => setLoading(false));
    }, [N8N, scope]);

    useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

    const assignLead = useCallback(async (webhookPath, campanaId) => {
        if (!user?.id) return;
        setLoadingBtn(campanaId ?? 'orphan');
        setError('');
        try {
            const url = campanaId
                ? `${N8N}/${webhookPath}?campana_id=${campanaId}`
                : `${N8N}/${webhookPath}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operator_id: user.id, mode: 'one' }),
            });
            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                throw new Error(`HTTP ${res.status} — ${errBody || 'sin cuerpo'}`);
            }
            const data = await res.json();
            if (!data.ok) {
                // TODO: webhooks crm-distribuidor-huerfanos y crm-distribuidor-campanas
                // serán creados en PR #4 — por ahora devuelven 404 esperados.
                console.warn(`[AsignameUnLead] Webhook ${webhookPath} returned ${res.status}`);
                throw new Error(data?.error || `HTTP ${res.status}`);
            }
            onAssigned?.(data.lead);
        } catch (err) {
            setError(err.message || 'Error al asignar lead');
        } finally {
            setLoadingBtn(null);
        }
    }, [N8N, user]);

    if (loading) {
        return (
            <div className="flex gap-3 items-center px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm">
                <div className="h-4 w-32 bg-slate-800 rounded-sm animate-pulse" />
                <div className="h-4 w-40 bg-slate-800 rounded-sm animate-pulse" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm">
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    ASIGNAR UN LEAD
                </span>

                <button
                    onClick={() => assignLead('crm-distribuidor-huerfanos', null)}
                    disabled={loadingBtn !== null}
                    className="px-3 py-1.5 rounded-sm bg-[#D00000] hover:bg-[#b00000] disabled:opacity-40
                        text-[10px] font-black uppercase tracking-wider text-white transition-colors"
                >
                    {loadingBtn === 'orphan' ? 'Asignando…' : 'Lead sin campaña'}
                </button>

                {campaigns.map(camp => (
                    <button
                        key={camp.id}
                        onClick={() => assignLead('crm-distribuidor-campanas', camp.id)}
                        disabled={loadingBtn !== null}
                        className="px-3 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-40
                            border border-slate-700 text-[10px] font-bold uppercase tracking-wider
                            text-slate-200 transition-colors"
                    >
                        {loadingBtn === camp.id ? '…' : camp.nombre || `Campaña ${camp.id}`}
                    </button>
                ))}
            </div>

            {error && (
                <p className="text-[10px] text-red-400 font-mono">{error}</p>
            )}
        </div>
    );
};

AsignameUnLead.propTypes = {
    onAssigned: PropTypes.func,
};

export default AsignameUnLead;
