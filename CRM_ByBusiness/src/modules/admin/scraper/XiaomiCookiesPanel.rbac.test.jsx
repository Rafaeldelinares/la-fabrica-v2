/**
 * XiaomiCookiesPanel.rbac.test.jsx
 *
 * Verifica el guard RBAC del componente XiaomiCookiesPanel.
 * Requiere 'admin.system.config' (admin only).
 *
 * @since xiaomi-cookies-admin 2026-08-12
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../../../shared/context/ToastContext';
import { useRbac } from '../../../shared/auth/useRbac';
import { useN8nQuery, useN8nMutation } from '../../../shared/hooks/useN8n';
import XiaomiCookiesPanel from './XiaomiCookiesPanel';

vi.mock('../../../shared/auth/useRbac', () => ({ useRbac: vi.fn() }));
vi.mock('../../../shared/hooks/useN8n', () => ({
  useN8nQuery: vi.fn(),
  useN8nMutation: vi.fn(),
}));

const allowedRbac = {
  can: vi.fn(() => true),
  canAll: vi.fn(() => true),
  canAny: vi.fn(() => true),
  permisos: ['admin.system.config'],
  user: { id: 1, role: 'admin' },
};
const deniedRbac = {
  can: vi.fn(() => false),
  canAll: vi.fn(() => false),
  canAny: vi.fn(() => false),
  permisos: [],
  user: { id: 2, role: 'operador' },
};

beforeEach(() => {
  vi.mocked(useN8nQuery).mockReturnValue({
    data: { hasData: false },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  vi.mocked(useN8nMutation).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
});

describe('XiaomiCookiesPanel RBAC', () => {
  it('muestra "Acceso restringido" cuando el user NO tiene admin.system.config', () => {
    vi.mocked(useRbac).mockReturnValue(deniedRbac);
    render(<ToastProvider><XiaomiCookiesPanel /></ToastProvider>);
    expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
  });

  it('renderiza el panel cuando el user tiene admin.system.config', () => {
    vi.mocked(useRbac).mockReturnValue(allowedRbac);
    render(<ToastProvider><XiaomiCookiesPanel /></ToastProvider>);
    expect(screen.queryByText(/acceso restringido/i)).not.toBeInTheDocument();
    // Header visible
    expect(screen.getByText(/cookies xiaomi-12/i)).toBeInTheDocument();
  });

  it('verifica que el permiso requerido es admin.system.config', () => {
    vi.mocked(useRbac).mockReturnValue(allowedRbac);
    render(<ToastProvider><XiaomiCookiesPanel /></ToastProvider>);
    expect(useRbac().can).toHaveBeenCalledWith('admin.system.config');
  });
});
