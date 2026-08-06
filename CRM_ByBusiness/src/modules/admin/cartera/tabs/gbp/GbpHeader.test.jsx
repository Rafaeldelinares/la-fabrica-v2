/**
 * GbpHeader.test.jsx
 *
 * Tests: score color thresholds, cacheAge formatting.
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GbpHeader from './GbpHeader';
import { cacheAge, scoreColorClass, SCORE_THRESHOLDS } from './gaps';

/* ------------------------------------------------------------------ */
/*  cacheAge tests                                                        */
/* ------------------------------------------------------------------ */

describe('cacheAge()', () => {
  it('devuelve null cuando no hay cachedAt', () => {
    expect(cacheAge(null)).toBeNull();
    expect(cacheAge(undefined)).toBeNull();
  });

  it('devuelve "ahora" para menos de 1 minuto', () => {
    const almostNow = new Date(Date.now() - 30_000).toISOString();
    expect(cacheAge(almostNow)).toBe('ahora');
  });

  it('devuelve "hace Xm" para menos de 1 hora', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(cacheAge(tenMinAgo)).toMatch(/^hace \d+m$/);
  });

  it('devuelve "hace Xh" para menos de 24 horas', () => {
    const threeHAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(cacheAge(threeHAgo)).toMatch(/^hace \d+h$/);
  });
});

/* ------------------------------------------------------------------ */
/*  scoreColorClass tests                                                 */
/* ------------------------------------------------------------------ */

describe('scoreColorClass()', () => {
  it('devuelve verde para score >= 80', () => {
    expect(scoreColorClass(80)).toBe('text-emerald-400');
    expect(scoreColorClass(100)).toBe('text-emerald-400');
  });

  it('devuelve amber para score >= 50 y < 80', () => {
    expect(scoreColorClass(50)).toBe('text-amber-400');
    expect(scoreColorClass(79)).toBe('text-amber-400');
  });

  it('devuelve rojo para score < 50', () => {
    expect(scoreColorClass(49)).toBe('text-red-400');
    expect(scoreColorClass(0)).toBe('text-red-400');
  });
});

/* ------------------------------------------------------------------ */
/*  SCORE_THRESHOLDS                                                     */
/* ------------------------------------------------------------------ */

describe('SCORE_THRESHOLDS', () => {
  it('HIGH es 80', () => {
    expect(SCORE_THRESHOLDS.HIGH).toBe(80);
  });
  it('MED es 50', () => {
    expect(SCORE_THRESHOLDS.MED).toBe(50);
  });
});

/* ------------------------------------------------------------------ */
/*  GbpHeader component                                                  */
/* ------------------------------------------------------------------ */

describe('GbpHeader component', () => {
  it('renderiza guiones cuando no hay audit', () => {
    render(<GbpHeader audit={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renderiza el score cuando hay audit', () => {
    render(<GbpHeader audit={{ rating_promedio: 4.5, reviews_count: 42, place_id: 'ChIJxxx' }} />);
    expect(screen.getByText(/ChIJxxx/)).toBeInTheDocument();
  });

  it('renderiza la cache pill cuando hay audit con _cached_at', () => {
    const cachedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    render(<GbpHeader audit={{ _cached: true, _cached_at: cachedAt, place_id: 'ChIJxxx' }} />);
    expect(screen.getByText(/hace \d+h/)).toBeInTheDocument();
  });
});
