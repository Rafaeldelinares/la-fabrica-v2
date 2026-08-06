/**
 * gaps.js — GBP gap analysis rule engine (stub for S2).
 *
 * S4 will implement the full deterministic rule engine.
 * This stub returns an empty array — S4 fills the rules.
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */

/**
 * @typedef {Object} Gap
 * @property {string} code
 * @property {'high'|'med'|'low'} severity
 * @property {string} human_label
 * @property {string} expected_impact_label
 */

/**
 * Computes GBP gaps from audit data (stub — returns [] in S2).
 *
 * @param {object} auditData - Raw audit data from crm-gbp-ficha-audit
 * @returns {Gap[]}
 */
export const computeGaps = (auditData) => {
  // S4 will implement: 8 deterministic rules → high/med/low gaps
  return [];
};

/** Score thresholds for GbpHeader */
export const SCORE_THRESHOLDS = {
  HIGH: 80,
  MED:  50,
};

/** Score color class by percentage */
export const scoreColorClass = (pct) => {
  if (pct >= SCORE_THRESHOLDS.HIGH) return 'text-emerald-400';
  if (pct >= SCORE_THRESHOLDS.MED)  return 'text-amber-400';
  return 'text-red-400';
};

/**
 * Format cache age string (reused from TabOptimizacionGbp.deprecated.jsx).
 * @param {string|null} cachedAt - ISO date string
 * @returns {string|null}
 */
export const cacheAge = (cachedAt) => {
  if (!cachedAt) return null;
  const cached = new Date(cachedAt);
  const now    = new Date();
  const diffMs = now - cached;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMin / 60);
  if (diffMin < 1)  return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffH < 24)   return `hace ${diffH}h`;
  return cached.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};
