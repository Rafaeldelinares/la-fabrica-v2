/**
 * gaps.js — GBP gap analysis deterministic rule engine.
 *
 * S4 implements 8 deterministic rules with tunable thresholds.
 * Sprint 2 may swap THRESHOLDS for n8n-served config.
 *
 * @since gbp-ficha-improvements S4 (2026-08-06)
 */

/**
 * @typedef {Object} Gap
 * @property {string} code           - snake_case identifier
 * @property {'high'|'med'|'low'} severity
 * @property {string} human_label    - Spanish label for UI
 * @property {*} evidence            - extracted value (e.g. fotos_count)
 */

/** Single source of truth for tuning thresholds. Mutable for testability. */
export const THRESHOLDS = {
  HORARIOS_DIAS_MIN: 5,
  DESCRIPCION_MIN_LENGTH: 200,
  FOTOS_MIN: 10,
  RATING_MIN: 4.0,
};

const SEVERITY_ORDER = { high: 0, med: 1, low: 2 };

/**
 * Computes GBP gaps from audit data.
 *
 * @param {object|null} auditData - Raw audit data from crm-gbp-ficha-audit
 * @returns {Gap[]}
 */
export function computeGaps(auditData) {
  if (!auditData || auditData.error) return [];
  const gaps = [];

  // R1: horarios_incompletos (high)
  if ((auditData.horarios_dias_cubiertos ?? 0) < THRESHOLDS.HORARIOS_DIAS_MIN) {
    gaps.push({
      code: 'horarios_incompletos',
      severity: 'high',
      human_label: `Horarios incompletos (${auditData.horarios_dias_cubiertos ?? 0}/${THRESHOLDS.HORARIOS_DIAS_MIN}+ días)`,
      evidence: auditData.horarios_dias_cubiertos ?? 0,
    });
  }

  // R2: descripcion_corta (high)
  const desc = auditData.descripcion ?? '';
  if (desc.length < THRESHOLDS.DESCRIPCION_MIN_LENGTH) {
    gaps.push({
      code: 'descripcion_corta',
      severity: 'high',
      human_label: desc.length === 0
        ? 'Sin descripción'
        : `Descripción muy corta (${desc.length}/${THRESHOLDS.DESCRIPCION_MIN_LENGTH}+ chars)`,
      evidence: desc.length,
    });
  }

  // R3: pocas_fotos (med)
  const fotos = auditData.fotos_count ?? 0;
  if (fotos < THRESHOLDS.FOTOS_MIN) {
    gaps.push({
      code: 'pocas_fotos',
      severity: 'med',
      human_label: `Pocas fotos (${fotos}/${THRESHOLDS.FOTOS_MIN}+ recomendado)`,
      evidence: fotos,
    });
  }

  // R4: sin_categorias_secundarias (med)
  const catsSec = auditData.categorias_secundarias ?? [];
  if (catsSec.length === 0) {
    gaps.push({
      code: 'sin_categorias_secundarias',
      severity: 'med',
      human_label: 'Sin categorías secundarias',
      evidence: catsSec.length,
    });
  }

  // R5: sin_posts (low)
  const posts = auditData.posts_count ?? 0;
  if (posts === 0) {
    gaps.push({
      code: 'sin_posts',
      severity: 'low',
      human_label: 'Sin publicaciones GBP',
      evidence: posts,
    });
  }

  // R6: qa_sin_responder (med)
  const qa = auditData.qa_count ?? 0;
  if (qa > 0) {
    gaps.push({
      code: 'qa_sin_responder',
      severity: 'med',
      human_label: `Q&A sin responder (${qa})`,
      evidence: qa,
    });
  }

  // R7: rating_bajo (med)
  const rating = auditData.rating_promedio;
  if (rating != null && rating < THRESHOLDS.RATING_MIN) {
    gaps.push({
      code: 'rating_bajo',
      severity: 'med',
      human_label: `Rating bajo (${rating.toFixed(1)}/${THRESHOLDS.RATING_MIN}+)`,
      evidence: rating,
    });
  }

  // R8: sin_horario_fin_semana (high)
  const dias = auditData.horarios_dias_cubiertos ?? 0;
  if (dias >= 1 && dias < 7) {
    gaps.push({
      code: 'sin_horario_fin_semana',
      severity: 'high',
      human_label: `Falta horario fin de semana (${dias}/7 días)`,
      evidence: dias,
    });
  }

  // Sort: high → med → low; same severity preserves insertion (code) order
  gaps.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return gaps;
}

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
