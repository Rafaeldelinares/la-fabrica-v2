/**
 * useGbpAuditHistory.test.jsx
 *
 * Tests: hook shape, query key, params, enabled flag.
 *
 * @since gbp-ficha-improvements S3 (2026-08-06)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../../../../shared/utils/envValidation', () => ({
  validateEnvVar: vi.fn(() => 'https://n8n.example.com'),
}));

vi.mock('../../../../../shared/hooks/useN8n', () => ({
  useN8nQuery: vi.fn(),
}));

import { useN8nQuery } from '../../../../../shared/hooks/useN8n';
import { useGbpAuditHistory, useGbpAuditDrift } from './hooks/useGbpAuditHistory.jsx';

describe('useGbpAuditHistory', () => {
  beforeEach(() => {
    vi.mocked(useN8nQuery).mockReset();
  });

  it('returns expected shape from useN8nQuery', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: null, isLoading: false, error: null });
    const { result } = renderHook(() => useGbpAuditHistory('ChIJxxx'));
    expect(result.current).toMatchObject({ data: null, isLoading: false, error: null });
  });

  it('calls useN8nQuery with correct path and params', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: null, isLoading: false, error: null });
    renderHook(() => useGbpAuditHistory('ChIJxxx', { limit: 5 }));
    expect(useN8nQuery).toHaveBeenCalledWith(
      ['gbp-audit-history', 'ChIJxxx'],
      'crm-gbp-audit-history-get',
      expect.objectContaining({ params: { place_id: 'ChIJxxx', limit: 5 }, staleTime: 60_000, enabled: true })
    );
  });

  it('disables query when placeId is null', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: null, isLoading: false, error: null });
    renderHook(() => useGbpAuditHistory(null));
    expect(useN8nQuery).toHaveBeenCalledWith(
      ['gbp-audit-history', null],
      'crm-gbp-audit-history-get',
      expect.objectContaining({ enabled: false })
    );
  });

  it('default limit is 10', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: null, isLoading: false, error: null });
    renderHook(() => useGbpAuditHistory('ChIJxxx'));
    expect(useN8nQuery).toHaveBeenCalledWith(
      ['gbp-audit-history', 'ChIJxxx'],
      'crm-gbp-audit-history-get',
      expect.objectContaining({ params: { place_id: 'ChIJxxx', limit: 10 } })
    );
  });
});

describe('useGbpAuditDrift', () => {
  beforeEach(() => {
    vi.mocked(useN8nQuery).mockReset();
  });

  it('returns expected shape', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: null, isLoading: false, error: null });
    const { result } = renderHook(() => useGbpAuditDrift('ChIJxxx'));
    expect(result.current).toMatchObject({ data: null, isLoading: false, error: null });
  });

  it('calls useN8nQuery with drift path', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: null, isLoading: false, error: null });
    renderHook(() => useGbpAuditDrift('ChIJxxx'));
    expect(useN8nQuery).toHaveBeenCalledWith(
      ['gbp-audit-drift', 'ChIJxxx'],
      'crm-gbp-audit-drift-get',
      expect.objectContaining({ params: { place_id: 'ChIJxxx' }, enabled: true })
    );
  });

  it('disabled when placeId is null', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: null, isLoading: false, error: null });
    renderHook(() => useGbpAuditDrift(null));
    expect(useN8nQuery).toHaveBeenCalledWith(
      ['gbp-audit-drift', null],
      'crm-gbp-audit-drift-get',
      expect.objectContaining({ enabled: false })
    );
  });
});
