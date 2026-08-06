/**
 * gaps.test.jsx
 *
 * Tests computeGaps stub (S2: returns []).
 * S4 will expand with 8 rules × 3 cases.
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import { describe, it, expect } from 'vitest';
import { computeGaps } from './gaps';

describe('computeGaps() — S2 stub', () => {
  it('devuelve array vacío para audit vacío', () => {
    expect(computeGaps({})).toEqual([]);
  });

  it('devuelve array vacío para audit null', () => {
    expect(computeGaps(null)).toEqual([]);
  });

  it('devuelve array vacío para audit con datos completos (S4 aún no implementado)', () => {
    const fullAudit = {
      rating_promedio: 4.8,
      reviews_count: 120,
      reviews_respondidas_pct: 90,
      fotos_count: 15,
      descripcion: 'A' .repeat(250),
      qa_count: 5,
      posts_count: 3,
      horarios_dias_cubiertos: 7,
      categorias_secundarias: ['Restaurant', 'Cafe'],
      gmaps_website: 'https://example.com',
    };
    // S4 will detect no gaps; S2 stub returns []
    expect(computeGaps(fullAudit)).toEqual([]);
  });
});
