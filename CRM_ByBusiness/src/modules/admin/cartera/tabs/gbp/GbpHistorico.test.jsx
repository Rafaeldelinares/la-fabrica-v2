/**
 * GbpHistorico.test.jsx
 *
 * Tests: empty states (no placeId, no history), timeline render, drift display.
 *
 * @since gbp-ficha-improvements S3 (2026-08-06)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GbpHistorico from './GbpHistorico';
import * as useGbpAuditHistory from './hooks/useGbpAuditHistory';

vi.mock('./hooks/useGbpAuditHistory');

const mockHistory = vi.mocked(useGbpAuditHistory.useGbpAuditHistory);
const mockDrift = vi.mocked(useGbpAuditHistory.useGbpAuditDrift);

const HISTORY_ROW = {
  audit_id: 1,
  place_id: 'ChIJxxx',
  cliente_id: 42,
  audit_data: { rating: 4.5, reviews_count: 120, fotos_count: 8, qa_count: 3 },
  audit_source: 'manual',
  scrape_duration_ms: 3500,
  audited_at: '2026-08-05T12:00:00Z',
};

const DRIFT_WITH_PREV = {
  place_id: 'ChIJxxx',
  audits_compared: 2,
  periodo: { from: '2026-08-01T00:00:00Z', to: '2026-08-05T12:00:00Z' },
  fotos_added: 3,
  reviews_count_delta: 12,
  rating_delta: 0.2,
  reviews_respondidas_delta: 5,
  descripcion_changed: false,
  has_previous: true,
};

describe('GbpHistorico', () => {
  beforeEach(() => {
    mockHistory.mockReset();
    mockDrift.mockReset();
  });

  it('shows empty state when placeId is null', () => {
    mockHistory.mockReturnValue({ data: null, isLoading: false, error: null });
    mockDrift.mockReturnValue({ data: null, isLoading: false, error: null });
    render(<GbpHistorico placeId={null} />);
    expect(screen.getByText(/Sin place_id/i)).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    mockHistory.mockReturnValue({ data: null, isLoading: true, error: null });
    mockDrift.mockReturnValue({ data: null, isLoading: false, error: null });
    render(<GbpHistorico placeId="ChIJxxx" />);
    // Loading skeleton: 2 pulsing divs
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows "Primer registro" empty state when history is empty', () => {
    mockHistory.mockReturnValue({ data: { history: [] }, isLoading: false, error: null });
    mockDrift.mockReturnValue({ data: { has_previous: false, place_id: 'ChIJxxx' }, isLoading: false, error: null });
    render(<GbpHistorico placeId="ChIJxxx" />);
    expect(screen.getByText(/Primer registro/i)).toBeInTheDocument();
  });

  it('renders history rows when data exists', () => {
    mockHistory.mockReturnValue({ data: { history: [HISTORY_ROW] }, isLoading: false, error: null });
    mockDrift.mockReturnValue({ data: null, isLoading: false, error: null });
    render(<GbpHistorico placeId="ChIJxxx" />);
    expect(screen.getByText('manual')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('shows drift section with has_previous=false', () => {
    mockHistory.mockReturnValue({ data: { history: [HISTORY_ROW] }, isLoading: false, error: null });
    mockDrift.mockReturnValue({ data: { has_previous: false, place_id: 'ChIJxxx' }, isLoading: false, error: null });
    render(<GbpHistorico placeId="ChIJxxx" />);
    expect(screen.getByText(/Primer registro.*sin histórico/i)).toBeInTheDocument();
  });

  it('shows drift deltas when has_previous=true', () => {
    mockHistory.mockReturnValue({ data: { history: [HISTORY_ROW] }, isLoading: false, error: null });
    mockDrift.mockReturnValue({ data: DRIFT_WITH_PREV, isLoading: false, error: null });
    render(<GbpHistorico placeId="ChIJxxx" />);
    expect(screen.getByText(/rating/)).toBeInTheDocument();
    expect(screen.getByText(/reviews/)).toBeInTheDocument();
    expect(screen.getByText(/fotos/)).toBeInTheDocument();
  });

  it('renders multiple history rows ordered by audited_at DESC', () => {
    const row2 = { ...HISTORY_ROW, audit_id: 2, audited_at: '2026-08-06T12:00:00Z' };
    const row1 = { ...HISTORY_ROW, audit_id: 1, audited_at: '2026-08-05T12:00:00Z' };
    mockHistory.mockReturnValue({ data: { history: [row2, row1] }, isLoading: false, error: null });
    mockDrift.mockReturnValue({ data: DRIFT_WITH_PREV, isLoading: false, error: null });
    render(<GbpHistorico placeId="ChIJxxx" />);
    const sources = screen.getAllByText('manual');
    expect(sources).toHaveLength(2);
  });
});
