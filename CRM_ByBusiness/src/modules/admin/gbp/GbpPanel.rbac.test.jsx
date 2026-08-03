/**
 * GbpPanel.rbac.test.jsx
 *
 * Verifica el guard RBAC del componente GbpPanel.
 * Después del fix 2026-08-03, requiere 'gbp.read' (supervisor+)
 * en lugar de 'gbp.write' (admin only).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRbac } from '../../../shared/auth/useRbac';
import GbpPanel from './GbpPanel';

vi.mock('../../../shared/auth/useRbac', () => ({ useRbac: vi.fn() }));
vi.mock('../../../shared/hooks/useN8n', () => ({
    n8nGet:  vi.fn(() => Promise.resolve({ ok: true, fichas: [] })),
    n8nPost: vi.fn(() => Promise.resolve({ ok: true })),
}));

const allowedRbac = { can: vi.fn(() => true), canAll: vi.fn(() => true), canAny: vi.fn(() => true), permisos: ['gbp.read'], user: { id: 1, role: 'supervisor' } };
const deniedRbac  = { can: vi.fn(() => false), canAll: vi.fn(() => false), canAny: vi.fn(() => false), permisos: [], user: { id: 2, role: 'operador' } };

const Wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('GbpPanel RBAC', () => {
    it('muestra "Acceso restringido" cuando el user NO tiene gbp.read', () => {
        vi.mocked(useRbac).mockReturnValue(deniedRbac);
        render(<GbpPanel />, { wrapper: Wrapper });
        expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
    });

    it('verifica que el permiso top-level es gbp.read (gbp.write se usa internamente para acciones de escritura)', () => {
        vi.mocked(useRbac).mockReturnValue(allowedRbac);
        render(<GbpPanel />, { wrapper: Wrapper });
        expect(useRbac().can).toHaveBeenCalledWith('gbp.read');
        // gbp.write se sigue usando dentro para acciones de edición de fichas — esto es correcto.
        expect(useRbac().can).toHaveBeenCalledWith('gbp.write');
    });
});
