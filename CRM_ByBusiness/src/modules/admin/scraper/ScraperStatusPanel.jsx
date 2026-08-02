import React from 'react';
import { useN8nQuery } from '../../../shared/hooks/useN8n';
import Card from '../../../shared/ui/Card';
import Skeleton from '../../../shared/ui/Skeleton';
import EmptyState from '../../../shared/ui/EmptyState';
import AccessDenied from '../../../shared/ui/AccessDenied';
import { useRbac } from '../../../shared/auth/useRbac';
import {
  Server, AlertTriangle, CheckCircle, XCircle, HelpCircle,
  RefreshCw, Clock
} from 'lucide-react';
import { fmtFechaHora } from '../../../utils/dates';

const SCRAPER_LABELS = { nano: 'Scraper Nano', heavy: 'Scraper Heavy', maps: 'Scraper Maps' };

const STATUS_CONFIG = {
  up:      { label: 'Operativo', icon: CheckCircle, color: 'text-emerald-400',   bg: 'bg-emerald-500/10 border-emerald-500/20' },
  down:    { label: 'CAÍDO',     icon: XCircle,     color: 'text-[#D00000]',     bg: 'bg-[#D00000]/10 border-[#D00000]/20' },
  unknown: { label: 'Sin datos', icon: HelpCircle,  color: 'text-slate-400',     bg: 'bg-slate-800 border-slate-700' },
};

const getStatusConfig = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.unknown;

const isStale = (refreshedAt) => {
  if (!refreshedAt) return false;
  return Date.now() - new Date(refreshedAt).getTime() > 2 * 60 * 1000;
};

const ScraperCard = ({ scraper }) => {
  const { name, status = 'unknown', last_check: lastCheck } = scraper;
  const { icon: Icon, color, bg, label } = getStatusConfig(status);
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 bg-slate-900 border border-slate-800 rounded-sm hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex items-center justify-center w-9 h-9 rounded-sm border shrink-0 ${bg}`}>
          <Icon size={16} className={color} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{SCRAPER_LABELS[name] || name}</p>
          <p className={`text-[11px] font-bold uppercase tracking-wider mt-0.5 ${color}`}>{label}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        {lastCheck
          ? <p className="text-[11px] font-mono text-slate-500">{fmtFechaHora(lastCheck)}</p>
          : <p className="text-[11px] text-slate-600 italic">Sin datos</p>
        }
      </div>
    </div>
  );
};

/** ScraperStatusPanel — displays health of nano, heavy, and maps scrapers. Reads CRM_SCRAPER_HEALTH. */
const ScraperStatusPanel = () => {
  const rbac = useRbac();
  const { data, isLoading, isError, refetch } = useN8nQuery(
    ['scraper-health'], 'crm-scraper-health',
    { refetchInterval: 60_000, staleTime: 30_000 }
  );

  if (!rbac.can('admin.system.config')) return <AccessDenied permission="admin.system.config" />;

  const scrapers  = data?.scrapers || [];
  const refreshedAt = data?.refreshed_at || null;
  const anyDown    = scrapers.some((s) => s.status === 'down');
  const allUnknown = scrapers.length > 0 && scrapers.every((s) => s.status === 'unknown');
  const panelStale = isStale(refreshedAt);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">SCRAPERS</h2>
          {refreshedAt && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-sm border border-slate-700">
              <Clock size={10} />{fmtFechaHora(refreshedAt)}
            </span>
          )}
          {panelStale && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-sm border border-amber-500/20">
              <AlertTriangle size={10} /> Datos puede no estar actualizados
            </span>
          )}
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {anyDown && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#D00000]/10 border border-[#D00000]/20 rounded-sm text-xs text-[#D00000]">
          <AlertTriangle size={14} />Uno o más scrapers están CAÍDOS. Revisa el estado de cada servicio abajo.
        </div>
      )}

      <Card className="!p-0 flex flex-col gap-2 p-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4 bg-slate-900 border border-slate-800 rounded-sm">
                <Skeleton className="w-9 h-9 rounded-sm" type="rect" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-4 w-40" type="rect" />
                  <Skeleton className="h-3 w-24" type="rect" />
                </div>
                <Skeleton className="h-3 w-28" type="rect" />
              </div>
            ))}
          </div>
        ) : isError || allUnknown ? (
          <div className="py-12">
            <EmptyState icon={Server} title="Servicio no disponible"
              description={isError ? 'No se pudo obtener el estado de los scrapers.' : 'Los scrapers aún no han reportado estado.'} />
          </div>
        ) : scrapers.length === 0 ? (
          <div className="py-12">
            <EmptyState icon={Server} title="Sin datos disponibles" description="Los scrapers aún no han ejecutado." />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {scrapers.map((scraper) => <ScraperCard key={scraper.name} scraper={scraper} />)}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ScraperStatusPanel;
