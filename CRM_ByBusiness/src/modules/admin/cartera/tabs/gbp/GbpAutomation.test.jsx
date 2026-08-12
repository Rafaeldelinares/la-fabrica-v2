/**
 * GbpAutomation.test.jsx
 *
 * Tests: health check display, manual refresh, button states, loading/error feedback.
 *
 * @since gbp-ficha-redesign 2026-08-12 (Stage 2)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../../../shared/hooks/useN8n', () => ({
  useN8nQuery: vi.fn(),
  useN8nMutation: vi.fn(),
}));

vi.mock('../../../../../shared/utils/envValidation', () => ({
  validateEnvVar: vi.fn(() => 'https://n8n.example.com'),
}));

const { useN8nQuery, useN8nMutation } = await import('../../../../../shared/hooks/useN8n');

import GbpAutomation from './GbpAutomation';

describe('GbpAutomation', () => {
  beforeEach(() => {
    vi.mocked(useN8nQuery).mockReset();
    vi.mocked(useN8nMutation).mockReset();
  });

  it('renderiza sin errores con props mínimas', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: null, isLoading: false });
    vi.mocked(useN8nMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isSuccess: false, error: null });
    render(<GbpAutomation clienteId="123" />);
    expect(screen.getByText('Estado del sistema')).toBeInTheDocument();
  });

  it('llama al health check al montar', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: null, isLoading: false });
    vi.mocked(useN8nMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isSuccess: false, error: null });
    render(<GbpAutomation clienteId="123" />);
    expect(useN8nQuery).toHaveBeenCalledWith(
      ['gbp-automation-health'],
      'crm-health',
      expect.objectContaining({ staleTime: 30_000 })
    );
  });

  it('muestra estado operativo cuando health check responde OK', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: true, isLoading: false });
    vi.mocked(useN8nMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isSuccess: false, error: null });
    render(<GbpAutomation clienteId="123" />);
    expect(screen.getByText('Sistema operativo')).toBeInTheDocument();
  });

  it('muestra estado caído cuando health check falla', () => {
    vi.mocked(useN8nQuery).mockReturnValue({ data: false, isLoading: false });
    vi.mocked(useN8nMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isSuccess: false, error: null });
    render(<GbpAutomation clienteId="123" />);
    expect(screen.getByText('Sistema caído')).toBeInTheDocument();
  });

  it('botón Reintentar dispara nuevo fetch', async () => {
    const refetch = vi.fn();
    vi.mocked(useN8nQuery).mockReturnValue({ data: false, isLoading: false, refetch });
    vi.mocked(useN8nMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isSuccess: false, error: null });
    render(<GbpAutomation clienteId="123" />);
    const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
    await userEvent.click(retryBtn);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('click en Ejecutar análisis ahora llama al webhook con cliente_id correcto', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useN8nQuery).mockReturnValue({ data: true, isLoading: false });
    vi.mocked(useN8nMutation).mockReturnValue({ mutateAsync, isPending: false, isSuccess: false, error: null });
    render(<GbpAutomation clienteId="456" />);
    const refreshBtn = screen.getByRole('button', { name: /Ejecutar análisis ahora/i });
    await userEvent.click(refreshBtn);
    expect(mutateAsync).toHaveBeenCalledWith({ cliente_id: '456', refresh: true });
  });

  it('botón se deshabilita durante ejecución', () => {
    const mutateAsync = vi.fn();
    vi.mocked(useN8nQuery).mockReturnValue({ data: true, isLoading: false });
    vi.mocked(useN8nMutation).mockReturnValue({ mutateAsync, isPending: true, isSuccess: false, error: null });
    render(<GbpAutomation clienteId="789" />);
    const refreshBtn = screen.getByRole('button', { name: /Ejecutar análisis ahora/i });
    expect(refreshBtn).toBeDisabled();
  });
});
