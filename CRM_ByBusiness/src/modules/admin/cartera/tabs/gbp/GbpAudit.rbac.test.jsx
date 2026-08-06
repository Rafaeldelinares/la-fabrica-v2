/**
 * GbpAudit.rbac.test.jsx
 *
 * RBAC matrix: admin/supervisor/operador × Auditar action.
 * Requires gbp.read to render the button and execute the audit (spec REQ-2).
 *
 * @since gbp-ficha-improvements S4-post-verify (2026-08-06)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import GbpAudit from './GbpAudit';
import * as useRbacModule from '../../../../../shared/auth/useRbac';

const mockAuditPayload = {
  rating_promedio: 4.5,
  reviews_count: 42,
  place_id: 'ChIJxxx',
  fotos_count: 10,
  descripcion: 'A'.repeat(250),
};

/** Shared runAudit mock — tests modify this reference directly. */
const runAuditMock = vi.fn(() => Promise.resolve({ data: mockAuditPayload }));

vi.mock('../../../../../shared/hooks/useN8n', () => ({ n8nPost: vi.fn() }));
vi.mock('./hooks/useGbpAudit', () => ({
  useGbpAudit: vi.fn(() => ({
    runAudit:  runAuditMock,
    isPending: false,
  })),
}));

const mockRbac = (canRead) => ({
  can:      vi.fn(() => canRead),
  canAll:   vi.fn(() => canRead),
  canAny:   vi.fn(() => canRead),
  permisos: canRead ? ['gbp.read'] : [],
  user:     { id: 1, role: canRead ? 'admin' : 'operador' },
});

const renderComponent = (placeId, rbacOverride) => {
  if (rbacOverride) {
    vi.spyOn(useRbacModule, 'useRbac').mockReturnValue(rbacOverride);
  }
  return render(<GbpAudit placeId={placeId} />);
};

describe('GbpAudit RBAC matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin (can gbp.read = true)', () => {
    it('renderiza botón Auditar', () => {
      renderComponent('ChIJxxx', mockRbac(true));
      expect(screen.getByRole('button', { name: 'Auditar' })).toBeInTheDocument();
    });

    it('botón Auditar habilitado con place_id no vacío', () => {
      renderComponent('ChIJxxx', mockRbac(true));
      expect(screen.getByRole('button', { name: 'Auditar' })).not.toBeDisabled();
    });

    it('botón Auditar deshabilitado cuando place_id está vacío', () => {
      renderComponent('', mockRbac(true));
      expect(screen.getByRole('button', { name: 'Auditar' })).toBeDisabled();
    });
  });

  describe('supervisor (can gbp.read = true)', () => {
    it('renderiza botón Auditar habilitado', () => {
      renderComponent('ChIJxxx', mockRbac(true));
      expect(screen.getByRole('button', { name: 'Auditar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Auditar' })).not.toBeDisabled();
    });
  });

  describe('operador (can gbp.read = false)', () => {
    it('renderiza botón Auditar deshabilitado', () => {
      renderComponent('ChIJxxx', mockRbac(false));
      const btn = screen.getByRole('button', { name: 'Auditar' });
      expect(btn).toBeDisabled();
    });

    it('muestra AccessDenied con permiso gbp.read', () => {
      renderComponent('ChIJxxx', mockRbac(false));
      expect(screen.getByText(/gbp\.read/i)).toBeInTheDocument();
      expect(screen.getByText('Acceso restringido')).toBeInTheDocument();
    });
  });
});

/**
 * Integration test: onAuditComplete recibe el payload de auditoría desembalado.
 *
 * Bug original: GbpAudit llamaba onAuditComplete(data) con la respuesta completa
 * del webhook (posiblemente { ok, data: {...} }), dejando auditData con el wrapper.
 * Los subcomponentes recibían auditData.rating_promedio = undefined → "—/5".
 *
 * Fix: onAuditComplete se llama con raw?.data ?? raw ?? null.
 *
 * @since gbp-ficha-improvements S4-post-verify (2026-08-06)
 */
describe('GbpAudit onAuditComplete unwrapping', () => {
  beforeEach(() => {
    // Reset runAudit — do NOT vi.clearAllMocks() (resets useRbac mock from RBAC tests).
    runAuditMock.mockReset();
    runAuditMock.mockResolvedValue({ data: mockAuditPayload });
    vi.spyOn(useRbacModule, 'useRbac').mockReturnValue(mockRbac(true));
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('desembala { data: {...} } → onAuditComplete recibe payload directo', async () => {
    const onAuditComplete = vi.fn();
    render(<GbpAudit placeId="ChIJxxx" onAuditComplete={onAuditComplete} />);
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Auditar' }));
    });
    expect(onAuditComplete).toHaveBeenCalledTimes(1);
    const [receivedPayload] = onAuditComplete.mock.calls[0];
    expect(receivedPayload).toEqual(mockAuditPayload);
    expect(receivedPayload.rating_promedio).toBe(4.5);
  });

  it('null → no llama onAuditComplete y muestra error', async () => {
    runAuditMock.mockResolvedValueOnce(null);
    const onAuditComplete = vi.fn();
    render(<GbpAudit placeId="ChIJxxx" onAuditComplete={onAuditComplete} />);
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Auditar' }));
    });
    expect(onAuditComplete).not.toHaveBeenCalled();
    expect(screen.getByText(/Error en la auditoría/i)).toBeInTheDocument();
  });
});
