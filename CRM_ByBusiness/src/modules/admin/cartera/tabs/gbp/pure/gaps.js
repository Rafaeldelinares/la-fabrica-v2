/**
 * gaps.js — GBP gap analysis deterministic rule engine.
 * S4 implements 8 deterministic rules with tunable thresholds.
 * Sprint 2 may swap THRESHOLDS for n8n-served config.
 * @since gbp-ficha-improvements S4 (2026-08-06)
 */
import { SEVERITY_ORDER } from './severity';

export const THRESHOLDS = {
  HORARIOS_DIAS_MIN: 5,
  DESCRIPCION_MIN_LENGTH: 200,
  FOTOS_MIN: 10,
  RATING_MIN: 4.0,
};
/**
 * @returns {Array<{code: string, severity: 'high'|'med'|'low', human_label: string, evidence: *}>}
 */
export function computeGaps(auditData) {
  if (!auditData || auditData.error) return [];
  const gaps = [];

  if ((auditData.horarios_dias_cubiertos ?? 0) < THRESHOLDS.HORARIOS_DIAS_MIN) {
    gaps.push({ code: 'horarios_incompletos', severity: 'high',
      human_label: `Horarios incompletos (${auditData.horarios_dias_cubiertos ?? 0}/${THRESHOLDS.HORARIOS_DIAS_MIN}+ días)`,
      evidence: auditData.horarios_dias_cubiertos ?? 0 });
  }

  const desc = auditData.descripcion ?? '';
  if (desc.length < THRESHOLDS.DESCRIPCION_MIN_LENGTH) {
    gaps.push({ code: 'descripcion_corta', severity: 'high',
      human_label: desc.length === 0 ? 'Sin descripción'
        : `Descripción muy corta (${desc.length}/${THRESHOLDS.DESCRIPCION_MIN_LENGTH}+ chars)`,
      evidence: desc.length });
  }

  const fotos = auditData.fotos_count ?? 0;
  if (fotos < THRESHOLDS.FOTOS_MIN) {
    gaps.push({ code: 'pocas_fotos', severity: 'med',
      human_label: `Pocas fotos (${fotos}/${THRESHOLDS.FOTOS_MIN}+ recomendado)`,
      evidence: fotos });
  }

  const catsSec = auditData.categorias_secundarias ?? [];
  if (catsSec.length === 0) {
    gaps.push({ code: 'sin_categorias_secundarias', severity: 'med',
      human_label: 'Sin categorías secundarias', evidence: 0 });
  }

  const posts = auditData.posts_count ?? 0;
  if (posts === 0) {
    gaps.push({ code: 'sin_posts', severity: 'low',
      human_label: 'Sin publicaciones GBP', evidence: 0 });
  }

  const qa = auditData.qa_count ?? 0;
  if (qa > 0) {
    gaps.push({ code: 'qa_sin_responder', severity: 'med',
      human_label: `Q&A sin responder (${qa})`, evidence: qa });
  }

  const rating = auditData.rating_promedio;
  if (rating != null && rating < THRESHOLDS.RATING_MIN) {
    gaps.push({ code: 'rating_bajo', severity: 'med',
      human_label: `Rating bajo (${rating.toFixed(1)}/${THRESHOLDS.RATING_MIN}+)`, evidence: rating });
  }

  const dias = auditData.horarios_dias_cubiertos ?? 0;
  if (dias >= 1 && dias < 7) {
    gaps.push({ code: 'sin_horario_fin_semana', severity: 'high',
      human_label: `Falta horario fin de semana (${dias}/7 días)`, evidence: dias });
  }

  gaps.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return gaps;
}

export const SCORE_THRESHOLDS = { HIGH: 80, MED: 50 };

export const scoreColorClass = (pct) =>
  pct >= SCORE_THRESHOLDS.HIGH ? 'text-emerald-400'
    : pct >= SCORE_THRESHOLDS.MED ? 'text-amber-400'
    : 'text-red-400';

/** @param {string|null} cachedAt @returns {string|null} */
export const cacheAge = (cachedAt) => {
  if (!cachedAt) return null;
  const diffMs  = Date.now() - new Date(cachedAt);
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMin / 60);
  if (diffMin < 1)  return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffH < 24)   return `hace ${diffH}h`;
  return new Date(cachedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};
