import React, { useState } from 'react';
import { useN8nQuery } from '../../../shared/hooks/useN8n';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import Skeleton from '../../../shared/ui/Skeleton';
import EmptyState from '../../../shared/ui/EmptyState';
import { useRbac } from '../../../shared/auth/useRbac';
import { ClipboardList, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { fmtFechaHora } from '../../../utils/dates';

const PAGE_SIZE = 50;
const EVENT_BADGE = {
  FRONTEND_ERROR: 'bg-red-500/10 text-red-400 border-red-500/20',
  USER_LOGIN: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  USER_LOGOUT: 'bg-slate-700 text-slate-400 border-slate-600',
  LEAD_ASSIGNED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CAMPAIGN_CHANGE: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

/** Read-only audit trail panel reading sistema.eventos_sistema via CRM_ADMIN_AUDIT_GET. */
const AdminAuditPanel = () => {
  const rbac = useRbac();
  const [filters, setFilters] = useState({ event_type: '', user_id: '', desde: '', hasta: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useN8nQuery(
    ['admin-audit', filters, page],
    'crm-admin-audit-get',
    {
      queryFn: () => {
        const params = { ...filters, page: String(page), page_size: String(PAGE_SIZE) };
        const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
        return fetch(`/webhook/crm-admin-audit-get?${qs}`).then((r) => r.json());
      },
      staleTime: 30_000,
    }
  );

  if (!rbac.can('reportes.read')) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-slate-600" />
          <h2 className="text-lg font-bold text-white mb-2">Acceso restringido</h2>
          <p className="text-sm text-slate-400">No tienes permiso para ver este panel.</p>
        </div>
      </div>
    );
  }

  const events = data?.events || [];
  const total = data?.total || 0;
  const warning = data?.warning || null;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const chg = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">AUDIT TRAIL</h2>
          {total > 0 && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-sm border border-slate-700">{total} REG.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={filters.event_type} onChange={(e) => chg('event_type', e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase">
            <option value="">Todos</option>
            <option value="FRONTEND_ERROR">FRONTEND_ERROR</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_LOGOUT">USER_LOGOUT</option>
            <option value="LEAD_ASSIGNED">LEAD_ASSIGNED</option>
            <option value="CAMPAIGN_CHANGE">CAMPAIGN_CHANGE</option>
          </select>
          <input type="date" value={filters.desde} onChange={(e) => chg('desde', e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono" />
          <input type="date" value={filters.hasta} onChange={(e) => chg('hasta', e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono" />
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* Dev notice */}
      {warning && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-sm text-xs text-amber-400">
          <AlertTriangle size={12} />{warning}
        </div>
      )}

      {/* Table */}
      <Card className="flex flex-col bg-slate-900 border-slate-800 !p-0 overflow-hidden flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-3 w-36" type="rect" />
                <Skeleton className="h-3 w-20" type="rect" />
                <Skeleton className="h-3 w-24" type="rect" />
                <Skeleton className="h-3 flex-1" type="rect" />
              </div>
            ))}
          </div>
        ) : events.length === 0 && !warning ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <EmptyState title="Sin eventos registrados" icon={ClipboardList} description="No hay eventos de auditoría en el rango seleccionado" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-mono">TIMESTAMP</th>
                  <th className="px-4 py-3">TYPE</th>
                  <th className="px-4 py-3">USER</th>
                  <th className="px-4 py-3">DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{fmtFechaHora(ev.timestamp)}</td>
                    <td className="px-4 py-3"><Badge className={EVENT_BADGE[ev.event_type] || 'bg-slate-800 text-slate-300 border-slate-700'}>{ev.event_type || '—'}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{ev.user_name || ev.user_id || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-300 max-w-[320px] truncate" title={ev.description}>{ev.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed bg-slate-900 border border-slate-800 rounded-sm transition-colors">
              <ChevronLeft size={12} />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-2">{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed bg-slate-900 border border-slate-800 rounded-sm transition-colors">
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditPanel;
