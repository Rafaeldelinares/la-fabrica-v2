/**
 * AgendaGlobalPanel.rbac.test.jsx
 *
 * Verifica el guard RBAC del componente AgendaGlobalPanel.
 * Después del fix 2026-08-03, requiere 'agenda.read.all' (supervisor+)
 * en lugar de 'admin.system.config' (admin only).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRbac } from '../../../shared/auth/useRbac';
import { useAuth } from '../../auth/AuthContext';
import { ToastProvider } from '../../../shared/context/ToastContext';
import AgendaGlobalPanel from './AgendaGlobalPanel';

vi.mock('../../../shared/auth/useRbac', () => ({ useRbac: vi.fn() }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const allowedRbac = { can: vi.fn(() => true), canAll: vi.fn(() => true), canAny: vi.fn(() => true), permisos: ['agenda.read.all'], user: { id: 1, role: 'supervisor' } };
const deniedRbac  = { can: vi.fn(() => false), canAll: vi.fn(() => false), canAny: vi.fn(() => false), permisos: [], user: { id: 2, role: 'operador' } };

// Wrapper con QueryClient para que useQuery() no falle y ToastProvider para useToast()
const Wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ToastProvider>
            {children}
        </ToastProvider>
    </QueryClientProvider>
);

beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 1, role: 'supervisor' } });
});

describe('AgendaGlobalPanel RBAC', () => {
    it('muestra "Acceso restringido" cuando el user NO tiene agenda.read.all', () => {
        vi.mocked(useRbac).mockReturnValue(deniedRbac);
        render(<AgendaGlobalPanel />, { wrapper: Wrapper });
        expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
    });

    it('verifica que el permiso correcto es agenda.read.all (no admin.system.config legacy)', () => {
        vi.mocked(useRbac).mockReturnValue(allowedRbac);
        render(<AgendaGlobalPanel />, { wrapper: Wrapper });
        expect(useRbac().can).toHaveBeenCalledWith('agenda.read.all');
        expect(useRbac().can).not.toHaveBeenCalledWith('admin.system.config');
    });
});
