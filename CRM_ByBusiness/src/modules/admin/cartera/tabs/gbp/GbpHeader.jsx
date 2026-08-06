/**
 * GbpHeader — Score + cache status pill.
 *
 * Shows the weighted GBP score and a cache freshness indicator.
 * Reuses cacheAge() and scoreColorClass() from pure/gaps.js.
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Star, Package } from 'lucide-react';
import { cacheAge, scoreColorClass } from './gaps';

/**
 * @param {{ audit: object|null }} props
 * audit may be null (not yet audited).
 */
const GbpHeader = ({ audit }) => {
  if (!audit) {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="flex items-center gap-1.5">
          <Star size={14} className="text-slate-600" />
          <span className="text-xs text-slate-500 font-mono">—</span>
        </div>
        <span className="text-[10px] text-slate-700 font-mono">Sin auditoría ejecutada</span>
      </div>
    );
  }

  // Weighted score calculation (AD-11 in design.md)
  const pctAtributos = audit.atributos_total > 0
    ? Math.round((audit.atributos_seteados / audit.atributos_total) * 100)
    : null;
  const pctReviews = audit.reviews_count > 0
    ? Math.round((audit.reviews_respondidas_pct || 0) * 100)
    : null;
  const pctFotos = audit.fotos_count >= 10 ? 80 : audit.fotos_count >= 3 ? 50 : null;
  const pctDesc  = audit.descripcion && audit.descripcion.length > 50 ? 80
                 : audit.descripcion ? 40 : null;
  const pctQA    = audit.qa_count > 0 ? 50 : null;
  const pctPosts = audit.posts_count > 0 ? 50 : null;

  const scoreItems = [
    pctAtributos !== null ? [pctAtributos, 0.40] : null,
    pctReviews    !== null ? [pctReviews,    0.30] : null,
    pctFotos     !== null ? [pctFotos,       0.15] : null,
    pctDesc      !== null ? [pctDesc,         0.10] : null,
    pctQA        !== null ? [pctQA,           0.03] : null,
    pctPosts     !== null ? [pctPosts,        0.02] : null,
  ].filter(Boolean);

  const avgScore = scoreItems.length > 0
    ? Math.round(scoreItems.reduce((acc, [v, w]) => acc + v * w, 0))
    : null;

  const isCached  = audit._cached === true;
  const cachedAt  = audit._cached_at;
  const cachedLabel = isCached && cachedAt ? cacheAge(cachedAt) : null;

  return (
    <div className="flex items-center gap-4 py-1">
      {/* Score */}
      <div className="flex items-center gap-1.5">
        <Star size={14} className={scoreColorClass(avgScore ?? 0).replace('text-', 'text-')} />
        <span className={`text-lg font-mono font-black ${scoreColorClass(avgScore ?? 0)}`}>
          {avgScore ?? '—'}<span className="text-xs text-slate-600">%</span>
        </span>
      </div>

      {/* Cache pill */}
      {cachedLabel && (
        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded-sm px-2 py-0.5">
          <Package size={9} />
          <span>Cache: {cachedLabel}</span>
        </div>
      )}

      {/* Place ID */}
      {audit.place_id && (
        <span className="ml-auto text-[9px] text-slate-700 font-mono truncate max-w-[180px]"
          title={audit.place_id}>
          {audit.place_id}
        </span>
      )}
    </div>
  );
};

GbpHeader.propTypes = {
  /** Raw audit data from crm-gbp-ficha-audit */
  audit: PropTypes.object,
};

export default GbpHeader;
