/**
 * gaps.test.js — GBP gap analysis rule engine tests.
 *
 * S4: 8 rules × (happy + edge + missing) + sort order + threshold tuning.
 *
 * @since gbp-ficha-improvements S4 (2026-08-06)
 */
import { describe, it, expect } from 'vitest';
import { computeGaps, THRESHOLDS } from './gaps';

describe('computeGaps() — null / error guard', () => {
  it('devuelve [] para null', () => {
    expect(computeGaps(null)).toEqual([]);
  });

  it('devuelve [] para undefined', () => {
    expect(computeGaps(undefined)).toEqual([]);
  });

  it('devuelve [] para error captcha', () => {
    expect(computeGaps({ error: 'captcha' })).toEqual([]);
  });

  it('devuelve [] para error timeout', () => {
    expect(computeGaps({ error: 'timeout' })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// R1 — horarios_incompletos (high)
// ---------------------------------------------------------------------------
describe('R1: horarios_incompletos', () => {
  it('happy: 3 días cubiertos → gap high', () => {
    const gaps = computeGaps({ horarios_dias_cubiertos: 3 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'horarios_incompletos', severity: 'high' }));
  });

  it('edge: exactamente 4 días → gap high (threshold es 5)', () => {
    const gaps = computeGaps({ horarios_dias_cubiertos: 4 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'horarios_incompletos', severity: 'high' }));
  });

  it('edge: exactamente 5 días → sin gap', () => {
    const gaps = computeGaps({ horarios_dias_cubiertos: 5 });
    expect(gaps.find((g) => g.code === 'horarios_incompletos')).toBeUndefined();
  });

  it('missing: sin propiedad → gap high', () => {
    const gaps = computeGaps({});
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'horarios_incompletos', severity: 'high' }));
  });
});

// ---------------------------------------------------------------------------
// R2 — descripcion_corta (high)
// ---------------------------------------------------------------------------
describe('R2: descripcion_corta', () => {
  it('happy: vacío → "Sin descripción"', () => {
    const gaps = computeGaps({ descripcion: '' });
    expect(gaps).toContainEqual(expect.objectContaining({
      code: 'descripcion_corta', severity: 'high', human_label: 'Sin descripción',
    }));
  });

  it('happy: 50 chars → gap high', () => {
    const gaps = computeGaps({ descripcion: 'A'.repeat(50) });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'descripcion_corta', severity: 'high' }));
  });

  it('edge: 199 chars → gap high (threshold es 200)', () => {
    const gaps = computeGaps({ descripcion: 'A'.repeat(199) });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'descripcion_corta', severity: 'high' }));
  });

  it('edge: 200 chars exact → sin gap', () => {
    const gaps = computeGaps({ descripcion: 'A'.repeat(200) });
    expect(gaps.find((g) => g.code === 'descripcion_corta')).toBeUndefined();
  });

  it('missing: sin propiedad → "Sin descripción"', () => {
    const gaps = computeGaps({});
    expect(gaps).toContainEqual(expect.objectContaining({
      code: 'descripcion_corta', severity: 'high', human_label: 'Sin descripción',
    }));
  });
});

// ---------------------------------------------------------------------------
// R3 — pocas_fotos (med)
// ---------------------------------------------------------------------------
describe('R3: pocas_fotos', () => {
  it('happy: 0 fotos → gap med', () => {
    const gaps = computeGaps({ fotos_count: 0 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'pocas_fotos', severity: 'med' }));
  });

  it('edge: 9 fotos → gap med (threshold es 10)', () => {
    const gaps = computeGaps({ fotos_count: 9 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'pocas_fotos', severity: 'med' }));
  });

  it('edge: 10 fotos exact → sin gap', () => {
    const gaps = computeGaps({ fotos_count: 10 });
    expect(gaps.find((g) => g.code === 'pocas_fotos')).toBeUndefined();
  });

  it('missing: sin propiedad → gap med', () => {
    const gaps = computeGaps({});
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'pocas_fotos', severity: 'med' }));
  });
});

// ---------------------------------------------------------------------------
// R4 — sin_categorias_secundarias (med)
// ---------------------------------------------------------------------------
describe('R4: sin_categorias_secundarias', () => {
  it('happy: array vacío → gap med', () => {
    const gaps = computeGaps({ categorias_secundarias: [] });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'sin_categorias_secundarias', severity: 'med' }));
  });

  it('happy: con categorías → sin gap', () => {
    const gaps = computeGaps({ categorias_secundarias: ['Restaurant'] });
    expect(gaps.find((g) => g.code === 'sin_categorias_secundarias')).toBeUndefined();
  });

  it('missing: sin propiedad → gap med', () => {
    const gaps = computeGaps({});
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'sin_categorias_secundarias', severity: 'med' }));
  });
});

// ---------------------------------------------------------------------------
// R5 — sin_posts (low)
// ---------------------------------------------------------------------------
describe('R5: sin_posts', () => {
  it('happy: 0 posts → gap low', () => {
    const gaps = computeGaps({ posts_count: 0 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'sin_posts', severity: 'low' }));
  });

  it('happy: 1 post → sin gap', () => {
    const gaps = computeGaps({ posts_count: 1 });
    expect(gaps.find((g) => g.code === 'sin_posts')).toBeUndefined();
  });

  it('missing: sin propiedad → gap low', () => {
    const gaps = computeGaps({});
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'sin_posts', severity: 'low' }));
  });
});

// ---------------------------------------------------------------------------
// R6 — qa_sin_responder (med)
// ---------------------------------------------------------------------------
describe('R6: qa_sin_responder', () => {
  it('happy: qa_count > 0 → gap med', () => {
    const gaps = computeGaps({ qa_count: 3 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'qa_sin_responder', severity: 'med' }));
  });

  it('edge: qa_count = 1 → gap med', () => {
    const gaps = computeGaps({ qa_count: 1 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'qa_sin_responder', severity: 'med' }));
  });

  it('happy: qa_count = 0 → sin gap', () => {
    const gaps = computeGaps({ qa_count: 0 });
    expect(gaps.find((g) => g.code === 'qa_sin_responder')).toBeUndefined();
  });

  it('missing: sin propiedad → sin gap', () => {
    const gaps = computeGaps({});
    expect(gaps.find((g) => g.code === 'qa_sin_responder')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// R7 — rating_bajo (med)
// ---------------------------------------------------------------------------
describe('R7: rating_bajo', () => {
  it('happy: 3.5 rating → gap med', () => {
    const gaps = computeGaps({ rating_promedio: 3.5 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'rating_bajo', severity: 'med' }));
  });

  it('edge: 3.9 → gap med (threshold es 4.0)', () => {
    const gaps = computeGaps({ rating_promedio: 3.9 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'rating_bajo', severity: 'med' }));
  });

  it('edge: 4.0 exact → sin gap', () => {
    const gaps = computeGaps({ rating_promedio: 4.0 });
    expect(gaps.find((g) => g.code === 'rating_bajo')).toBeUndefined();
  });

  it('edge: null rating → sin gap', () => {
    const gaps = computeGaps({ rating_promedio: null });
    expect(gaps.find((g) => g.code === 'rating_bajo')).toBeUndefined();
  });

  it('missing: sin propiedad → sin gap', () => {
    const gaps = computeGaps({});
    expect(gaps.find((g) => g.code === 'rating_bajo')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// R8 — sin_horario_fin_semana (high)
// ---------------------------------------------------------------------------
describe('R8: sin_horario_fin_semana', () => {
  it('happy: 2 días cubiertos → gap high', () => {
    const gaps = computeGaps({ horarios_dias_cubiertos: 2 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'sin_horario_fin_semana', severity: 'high' }));
  });

  it('edge: 6 días → gap high', () => {
    const gaps = computeGaps({ horarios_dias_cubiertos: 6 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'sin_horario_fin_semana', severity: 'high' }));
  });

  it('edge: 0 días → sin gap (no es "fin de semana" si no hay ningún horario)', () => {
    const gaps = computeGaps({ horarios_dias_cubiertos: 0 });
    expect(gaps.find((g) => g.code === 'sin_horario_fin_semana')).toBeUndefined();
  });

  it('edge: 7 días exact → sin gap', () => {
    const gaps = computeGaps({ horarios_dias_cubiertos: 7 });
    expect(gaps.find((g) => g.code === 'sin_horario_fin_semana')).toBeUndefined();
  });

  it('missing: sin propiedad → sin gap (no cumple condición ≥1)', () => {
    const gaps = computeGaps({});
    expect(gaps.find((g) => g.code === 'sin_horario_fin_semana')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Sort order
// ---------------------------------------------------------------------------
describe('Sort order — severity high → med → low', () => {
  it('múltiples severidades: high antes que med', () => {
    const gaps = computeGaps({
      horarios_dias_cubiertos: 2,   // R1 high + R8 high
      descripcion: '',              // R2 high
      fotos_count: 0,               // R3 med
    });
    const severities = gaps.map((g) => g.severity);
    // high debe estar antes que med
    const firstHigh = severities.indexOf('high');
    const firstMed  = severities.indexOf('med');
    expect(firstHigh).toBeLessThan(firstMed);
  });

  it('misma severidad: gaps med mantienen orden estable entre invocaciones', () => {
    // ratings bajos + qa + fotos = 3 gaps med
    const gaps = computeGaps({
      rating_promedio: 3.0, // R7 med
      qa_count: 5,          // R6 med
      fotos_count: 2,       // R3 med
    });
    const medGaps = gaps.filter((g) => g.severity === 'med');
    const codes = medGaps.map((g) => g.code);
    // Los 3 códigos med deben estar presentes
    expect(codes).toContain('pocas_fotos');
    expect(codes).toContain('qa_sin_responder');
    expect(codes).toContain('rating_bajo');
    // Invocación repetida devuelve el mismo orden (estabilidad del sort)
    const gaps2 = computeGaps({ rating_promedio: 3.0, qa_count: 5, fotos_count: 2 });
    const codes2 = gaps2.filter((g) => g.severity === 'med').map((g) => g.code);
    expect(codes2).toEqual(codes);
  });

  it('high → med → low es el orden correcto', () => {
    const gaps = computeGaps({
      horarios_dias_cubiertos: 0, // R1 high
      descripcion: '',             // R2 high
      fotos_count: 0,             // R3 med
      posts_count: 0,             // R5 low
      rating_promedio: 3.0,       // R7 med
    });
    const severities = gaps.map((g) => g.severity);
    const highIdx = severities.indexOf('high');
    const medIdx  = severities.indexOf('med');
    const lowIdx  = severities.indexOf('low');
    expect(highIdx).toBeLessThan(medIdx);
    expect(medIdx).toBeLessThan(lowIdx);
  });
});

// ---------------------------------------------------------------------------
// Threshold tuning
// ---------------------------------------------------------------------------
describe('Threshold tuning — THRESHOLDS mutable para tests', () => {
  afterEach(() => {
    // Restore all thresholds to their defaults after each test
    THRESHOLDS.HORARIOS_DIAS_MIN = 5;
    THRESHOLDS.DESCRIPCION_MIN_LENGTH = 200;
    THRESHOLDS.FOTOS_MIN = 10;
    THRESHOLDS.RATING_MIN = 4.0;
  });

  it('subir HORARIOS_DIAS_MIN a 7 hace que 5 días tenga gap', () => {
    THRESHOLDS.HORARIOS_DIAS_MIN = 7;
    const gaps = computeGaps({ horarios_dias_cubiertos: 5 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'horarios_incompletos' }));
  });

  it('bajar DESCRIPCION_MIN_LENGTH a 50 hace que 80 chars no tenga gap', () => {
    THRESHOLDS.DESCRIPCION_MIN_LENGTH = 50;
    const gaps = computeGaps({ descripcion: 'A'.repeat(80) });
    expect(gaps.find((g) => g.code === 'descripcion_corta')).toBeUndefined();
  });

  it('subir FOTOS_MIN a 15 hace que 10 fotos tenga gap', () => {
    THRESHOLDS.FOTOS_MIN = 15;
    const gaps = computeGaps({ fotos_count: 10 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'pocas_fotos' }));
  });

  it('subir RATING_MIN a 4.5 hace que 4.2 tenga gap', () => {
    THRESHOLDS.RATING_MIN = 4.5;
    const gaps = computeGaps({ rating_promedio: 4.2 });
    expect(gaps).toContainEqual(expect.objectContaining({ code: 'rating_bajo' }));
  });
});

// ---------------------------------------------------------------------------
// Full audit — well-known (sin gaps)
// ---------------------------------------------------------------------------
describe('Full audit — ficha completa sin gaps', () => {
  it('audit completo ideal → 0 gaps', () => {
    const fullAudit = {
      horarios_dias_cubiertos: 7,
      descripcion: 'A'.repeat(300),
      fotos_count: 20,
      categorias_secundarias: ['Restaurant', 'Cafe'],
      posts_count: 5,
      qa_count: 0,
      rating_promedio: 4.8,
    };
    expect(computeGaps(fullAudit)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Full audit — mala ficha (todos los gaps)
// ---------------------------------------------------------------------------
describe('Full audit — mala ficha (muchos gaps)', () => {
  it('audit malo: varios gaps de alta/baja severidad + evidence preservado', () => {
    const badAudit = {
      rating_promedio: 3.0,
      descripcion: 'corto',
      fotos_count: 2,
      horarios_dias_cubiertos: 2,
      categorias_secundarias: [],
      posts_count: 0,
      qa_count: 3,
    };
    const gaps = computeGaps(badAudit);
    // Verifica códigos esperados presentes
    const codes = gaps.map((g) => g.code);
    expect(codes).toContain('horarios_incompletos');
    expect(codes).toContain('descripcion_corta');
    expect(codes).toContain('sin_horario_fin_semana');
    expect(codes).toContain('pocas_fotos');
    expect(codes).toContain('rating_bajo');
    // evidence preservado para descripcion_corta (evidence = longitud real)
    const descGap = gaps.find((g) => g.code === 'descripcion_corta');
    expect(descGap.evidence).toBe(5); // 'corto'.length === 5
    // evidence preservado para pocas_fotos
    const fotoGap = gaps.find((g) => g.code === 'pocas_fotos');
    expect(fotoGap.evidence).toBe(2);
    // Todos high/med vienen antes de low
    const lowIdx = gaps.findIndex((g) => g.severity === 'low');
    const medIdx  = gaps.findIndex((g) => g.severity === 'med');
    const highIdx = gaps.findIndex((g) => g.severity === 'high');
    expect(highIdx).toBeLessThan(medIdx);
    expect(medIdx).toBeLessThan(lowIdx);
  });
});
