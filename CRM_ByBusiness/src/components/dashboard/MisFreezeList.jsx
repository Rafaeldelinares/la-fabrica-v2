import React, { useState } from 'react';
import { Snowflake, Unfreeze, X, Check } from 'lucide-react';
import { useN8nQuery, useN8nMutation } from '../../shared/hooks/useN8n';
import Skeleton from '../../shared/ui/Skeleton';

/**
 * Extracts frozen leads from n8n response.
 * n8n returns: [{json: {frozen_leads: [...]}}]
 */
const extractFrozenLeads = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  const json = data[0]?.json;
  if (!json) return [];
  return json.frozen_leads || [];
};

/**
 * Formats an ISO date string for display.
 */
const formatFrozenDate = (isoString) => {
  if (!isoString) return '--/--/----';
  const d = new Date(isoString);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ─── Sub-components ────────────────────────────────────────────────────────

/** Single frozen lead row */
const FrozenLeadItem = ({ lead, onUnfreeze }) => {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm">
      <div className="flex items-center gap-3 min-w-0">
        <Snowflake size={14} className="text-blue-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {lead.nombre || 'Sin nombre'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-slate-500">
              {formatFrozenDate(lead.congelado_en)}
            </span>
            <span className="text-[10px] text-slate-600">·</span>
            <span className="text-[10px] text-blue-400">No contesta</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onUnfreeze(lead)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors px-2 py-1 rounded-sm hover:bg-slate-800 shrink-0"
        title="Descongelar"
      >
        <Unfreeze size={12} />
        <span>Descongelar</span>
      </button>
    </div>
  );
};

/** Confirmation dialog for unfreeze */
const UnfreezeDialog = ({ lead, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-80 flex flex-col gap-4">
      <h3 className="text-sm font-bold text-white">¿Descongelar este lead?</h3>
      <p className="text-xs text-slate-400">
        <span className="text-white font-medium">{lead?.nombre || 'Este lead'}</span> será
        removido de la lista de congelados.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          No
        </button>
        <button
          onClick={() => onConfirm(lead)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-sm transition-colors"
        >
          <Check size={12} />
          Sí, descongelar
        </button>
      </div>
    </div>
  </div>
);

// ─── Main panel ────────────────────────────────────────────────────────────

/**
 * MisFreezeList — shows frozen leads due to "no contesta" status.
 * Supports manual unfreeze via confirmation dialog.
 *
 * @param {Object} props
 * @param {number} props.operatorId - ID of the current operator
 */
const MisFreezeList = ({ operatorId }) => {
  const [toUnfreeze, setToUnfreeze] = useState(null);
  const [notification, setNotification] = useState(null);

  const { data, isLoading, refetch } = useN8nQuery(
    ['frozen-leads', operatorId],
    'crm-leads-freezed-list',
    {
      queryFn: () =>
        fetch(`/webhook/crm-leads-freezed-list?operador_id=${operatorId}&action=list`).then(
          (r) => r.json()
        ),
      refetchInterval: 60_000,
      staleTime: 30_000,
      enabled: Boolean(operatorId),
      select: extractFrozenLeads,
    }
  );

  const unfreezeMutation = useN8nMutation('crm-leads-freezed-list');

  const showNotification = (type, message) => {
    setNotification({ type, message });
    const timer = setTimeout(() => setNotification(null), 3500);
    // Store timer ref for cleanup if component unmounts
    return () => clearTimeout(timer);
  };

  const handleUnfreeze = (lead) => setToUnfreeze(lead);

  const handleUnfreezeConfirm = async (lead) => {
    try {
      await unfreezeMutation.mutateAsync({
        action: 'unfreeze',
        lead_id: lead.id,
        operador_id: operatorId,
      });
      setToUnfreeze(null);
      showNotification('success', 'Lead descongelado correctamente');
      refetch();
    } catch {
      showNotification('error', 'No se pudo descongelar el lead');
    }
  };

  // Section hidden when no frozen leads and not loading
  if (!isLoading && (!data || data.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Snowflake size={12} className="text-blue-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Leads Congelados
        </span>
        {data && data.length > 0 && (
          <span className="text-[10px] font-mono text-slate-600">{data.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-3" type="circle" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" type="rect" />
                  <Skeleton className="h-2 w-12" type="rect" />
                </div>
              </div>
              <Skeleton className="h-5 w-20" type="rect" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {data.map((lead) => (
            <FrozenLeadItem key={lead.id} lead={lead} onUnfreeze={handleUnfreeze} />
          ))}
        </div>
      )}

      {/* Notification toast */}
      {notification && (
        <div
          className={`text-xs px-3 py-2 rounded-sm ${
            notification.type === 'success'
              ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
              : 'bg-red-900/50 text-red-400 border border-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Unfreeze confirmation dialog */}
      {toUnfreeze && (
        <UnfreezeDialog
          lead={toUnfreeze}
          onConfirm={handleUnfreezeConfirm}
          onClose={() => setToUnfreeze(null)}
        />
      )}
    </div>
  );
};

export default MisFreezeList;
