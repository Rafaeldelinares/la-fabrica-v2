import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { n8nGet } from '../../../../shared/hooks/useN8n';
import KeywordsPanel from '../../seo/KeywordsPanel';

/**
 * TabSeoLocal — SEO orgónico para cartera.
 * Muestra resumen de salud + keywords + placeholder geo-grid Phase 3.
 * @param {{ clienteId: number, bybusinessUrl: string }} props
 */
const TabSeoLocal = ({ clienteId, bybusinessUrl }) => {
  const { data } = useQuery({
    queryKey: ['seo-keywords', clienteId],
    queryFn: () => n8nGet('crm-seo-keywords-list', { cliente_id: clienteId }),
    enabled: !!clienteId,
    staleTime: 60000,
  });

  const keywords = data?.keywords || [];
  const activeCount = keywords.filter(k => k.is_active).length;
  const positions = keywords
    .filter(k => k.latest_position != null)
    .map(k => k.latest_position);
  const bestPosition = positions.length > 0 ? Math.min(...positions) : null;
  const lastScraped = keywords
    .map(k => k.latest_scraped_at)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <div className="flex flex-col gap-4 px-3 py-4">

      {/* ── A) Resumen de salud ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 border border-slate-800 rounded-sm px-3 py-2 text-center">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Keywords activas</p>
          <p className="text-[10px] text-slate-300 font-mono font-bold mt-0.5">{activeCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-sm px-3 py-2 text-center">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Mejor posicion</p>
          <p className={`text-[10px] font-mono font-bold mt-0.5 ${
            bestPosition != null && bestPosition <= 10 ? 'text-emerald-400' : 'text-slate-300'
          }`}>
            {bestPosition != null ? `#${bestPosition}` : '—'}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-sm px-3 py-2 text-center">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Ultimo scrape</p>
          <p className="text-[10px] text-slate-300 font-mono font-bold mt-0.5">
            {lastScraped
              ? new Date(lastScraped).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
              : '—'}
          </p>
        </div>
      </div>

      {/* ── B) Keywords organicas ── */}
      <KeywordsPanel clienteId={clienteId} bybusinessUrl={bybusinessUrl} />

      {/* ── C) Phase 3 placeholder ── */}
      <div className="px-3 py-4 border border-dashed border-slate-800 rounded-sm text-center">
        <p className="text-[10px] text-slate-600 font-mono">
          Geo-grid ranking — disponible en Phase 3
        </p>
      </div>
    </div>
  );
};

TabSeoLocal.propTypes = {
  clienteId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  bybusinessUrl: PropTypes.string,
};

export default TabSeoLocal;
