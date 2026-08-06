/**
 * severity.js — Severity constants for GBP gap analysis.
 * @since gbp-ficha-improvements S4-post-verify (2026-08-06)
 */
export const SEVERITY_ORDER = Object.freeze({ high: 0, med: 1, low: 2 });
export const SEVERITY_LABELS = Object.freeze({ high: 'Alta', med: 'Media', low: 'Baja' });
export const SEVERITY_COLOR_CLASS = Object.freeze({
  high: 'text-red-400',
  med:  'text-amber-400',
  low:  'text-slate-500',
});
