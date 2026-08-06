/**
 * GbpGestionPlaceId.rbac.test.jsx
 *
 * RBAC matrix: admin/supervisor/operador × Save action.
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import GbpGestionPlaceId from './GbpGestionPlaceId';
import * as useRbacModule from '../../../../../shared/auth/useRbac';

// Mock n8nPost
vi.mock('../../../../../shared/hooks/useN8n', () => ({
  n8nPost: vi.fn(),
}));

const mockRbac = (can) => ({ can: vi.fn(() => can), permisos: [], user: null });

const renderComponent = (clienteId, initialPlaceId, rbacOverride) => {
  const rbac = rbacOverride || mockRbac(false);
  if (rbacOverride) {
    vi.spyOn(useRbacModule, 'useRbac').mockReturnValue(rbac);
  }
  return render(<GbpGestionPlaceId clienteId={clienteId} initialPlaceId={initialPlaceId} />);
};

describe('GbpGestionPlaceId RBAC matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin (can gbp.write = true)', () => {
    it('renderiza el botón Guardar', () => {
      renderComponent(1, 'ChIJxxx', mockRbac(true));
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    });

    it('botón Guardar está habilitado con place_id no vacío', async () => {
      const user = userEvent.setup();
      renderComponent(1, 'ChIJxxx', mockRbac(true));
      const btn = screen.getByRole('button', { name: 'Guardar' });
      expect(btn).not.toBeDisabled();
    });

    it('botón Guardar deshabilitado cuando place_id está vacío', async () => {
      const user = userEvent.setup();
      renderComponent(1, '', mockRbac(true));
      const btn = screen.getByRole('button', { name: 'Guardar' });
      expect(btn).toBeDisabled();
    });
  });

  describe('supervisor (can gbp.write = false)', () => {
    it('NO renderiza botón Guardar — muestra solo lectura', () => {
      renderComponent(1, 'ChIJxxx', mockRbac(false));
      expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
      expect(screen.getByText('Solo lectura')).toBeInTheDocument();
    });
  });

  describe('operador (can gbp.read = false — tab level)', () => {
    it('GbpGestionPlaceId no hace nada special — tab-level gate ya filtra al componente', () => {
      // En la práctica, GbpGestionPlaceId se monta solo para usuarios con gbp.read.
      // El test confirma que se monta sin errores.
      renderComponent(1, 'ChIJxxx', mockRbac(false));
      expect(screen.getByPlaceholderText('ChIJN1rTLr-GyuEmsRBfNs7J4aca')).toBeInTheDocument();
    });
  });
});
