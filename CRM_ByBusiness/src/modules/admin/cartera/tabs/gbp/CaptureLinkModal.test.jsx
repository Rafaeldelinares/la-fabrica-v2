/**
 * CaptureLinkModal.test.jsx
 * @since gbp-ficha-improvements (2026-08-06)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CaptureLinkModal from './CaptureLinkModal';

// Mock n8nPost
const mockN8nPost = vi.fn();
vi.mock('../../../../../shared/hooks/useN8n', () => ({
  n8nPost: (...args) => mockN8nPost(...args),
}));

describe('CaptureLinkModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockN8nPost.mockReset();
  });

  it('renderiza cuando isOpen=true', () => {
    render(
      <CaptureLinkModal isOpen={true} onClose={() => {}} onExtracted={() => {}} />
    );
    expect(screen.getByText('📋 Capturar link de Google Maps')).toBeTruthy();
    expect(screen.getByRole('button', { name: /extraer/i })).toBeTruthy();
  });

  it('no renderiza cuando isOpen=false', () => {
    render(
      <CaptureLinkModal isOpen={false} onClose={() => {}} onExtracted={() => {}} />
    );
    expect(screen.queryByText('📋 Capturar link de Google Maps')).toBeNull();
  });

  it('muestra error cuando la URL no es reconocida', async () => {
    mockN8nPost.mockResolvedValueOnce({ error: 'unrecognized' });
    render(
      <CaptureLinkModal isOpen={true} onClose={() => {}} onExtracted={() => {}} />
    );
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'https://maps.google.com/?q=invalid' } });
    fireEvent.click(screen.getByRole('button', { name: /extraer/i }));
    await waitFor(() => {
      expect(screen.getByText('URL no reconocida')).toBeTruthy();
    });
  });

  it('llama a onExtracted con place_id y cierra al obtener resultado', async () => {
    const onExtracted = vi.fn();
    const onClose = vi.fn();
    mockN8nPost.mockResolvedValueOnce({
      place_id: '0xd45fd88018193cb:0x74eb598a12c63f32',
      format: 'hex_cid',
    });
    render(
      <CaptureLinkModal isOpen={true} onClose={onClose} onExtracted={onExtracted} />
    );
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'https://www.google.com/maps/place/Test/@40.0,-3.0/data=!4m6!1m2!2m1!1s0xd45fd88018193cb:0x74eb598a12c63f32' },
    });
    fireEvent.click(screen.getByRole('button', { name: /extraer/i }));
    await waitFor(() => {
      expect(onExtracted).toHaveBeenCalledWith('0xd45fd88018193cb:0x74eb598a12c63f32');
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('muestra error de conexión en fallo de red', async () => {
    mockN8nPost.mockRejectedValueOnce(new Error('network error'));
    render(
      <CaptureLinkModal isOpen={true} onClose={() => {}} onExtracted={() => {}} />
    );
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'https://maps.google.com/?q=test' } });
    fireEvent.click(screen.getByRole('button', { name: /extraer/i }));
    await waitFor(() => {
      expect(screen.getByText('Error de conexión con el servidor')).toBeTruthy();
    });
  });

  it('botón Extrer deshabilitado con textarea vacío', () => {
    render(
      <CaptureLinkModal isOpen={true} onClose={() => {}} onExtracted={() => {}} />
    );
    expect(screen.getByRole('button', { name: /extraer/i })).toBeDisabled();
  });

  it('cierra al hacer click en X', () => {
    const onClose = vi.fn();
    render(
      <CaptureLinkModal isOpen={true} onClose={onClose} onExtracted={() => {}} />
    );
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });
});
