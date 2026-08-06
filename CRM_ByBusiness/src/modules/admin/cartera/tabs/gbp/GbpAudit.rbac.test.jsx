/**
 * GbpAudit.rbac.test.jsx
 *
 * RBAC matrix: admin/supervisor/operador × Auditar action.
 * Requires gbp.read to render the button and execute the audit (spec REQ-2).
 *
 * @since gbp-ficha-improvements S4-post-verify (2026-08-06)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import GbpAudit from './GbpAudit';
import * as useRbacModule from '../../../../../shared/auth/useRbac';

vi.mock('../../../../../shared/hooks/useN8n', () => ({ n8nPost: vi.fn() }));
vi.mock('./hooks/useGbpAudit', () => ({
  useGbpAudit: vi.fn(() => ({
    runAudit:  vi.fn(() => Promise.resolve({ success: true })),
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
