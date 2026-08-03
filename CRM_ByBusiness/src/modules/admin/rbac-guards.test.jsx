/**
 * rbac-guards.test.jsx
 *
 * Verifica el guard RBAC de los 4 paneles admin que se agregaron en la sesión 2026-08-03:
 * - CarteraPanel (clientes.read.all)
 * - FacturacionPanel (ventas.read.all)
 * - CandidatosPanel (candidatos.read)
 * - VentasPanel (ventas.read.all)
 *
 * Estos paneles no tenían RBAC antes (gap de seguridad P1 del action plan).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Polyfill ResizeObserver para jsdom (usado por FacturacionPanel)
global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
import { useRbac } from '../../shared/auth/useRbac';
import { useAuth } from '../auth/AuthContext';
import CarteraPanel from './cartera/CarteraPanel';
import FacturacionPanel from './facturacion/FacturacionPanel';
import CandidatosPanel from './candidatos/CandidatosPanel';
import VentasPanel from './ventas/VentasPanel';

const Wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

vi.mock('../../shared/auth/useRbac', () => ({ useRbac: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../shared/hooks/useN8n', () => ({
    n8nGet:  vi.fn(() => Promise.resolve({ ok: true, data: [] })),
    n8nPost: vi.fn(() => Promise.resolve({ ok: true })),
}));

const allowedRbac = (perm) => ({
    can: vi.fn((p) => p === perm),
    canAll: vi.fn(() => true),
    canAny: vi.fn(() => true),
    permisos: [perm],
    user: { id: 1, role: 'supervisor' },
});
const deniedRbac = {
    can: vi.fn(() => false),
    canAll: vi.fn(() => false),
    canAny: vi.fn(() => false),
    permisos: [],
    user: { id: 2, role: 'operador' },
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 1, role: 'supervisor' } });
});

describe('CarteraPanel RBAC', () => {
    it('muestra "Acceso restringido" sin clientes.read.all', () => {
        vi.mocked(useRbac).mockReturnValue(deniedRbac);
        render(<CarteraPanel />);
        expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
    });

    it('pasa el guard con clientes.read.all (no muestra access denied)', () => {
        vi.mocked(useRbac).mockReturnValue(allowedRbac('clientes.read.all'));
        render(<CarteraPanel />);
        expect(screen.queryByText(/acceso restringido/i)).not.toBeInTheDocument();
    });
});

describe('FacturacionPanel RBAC', () => {
    it('muestra "Acceso restringido" sin ventas.read.all', () => {
        vi.mocked(useRbac).mockReturnValue(deniedRbac);
        render(<FacturacionPanel />);
        expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
    });

    it('pasa el guard con ventas.read.all', () => {
        vi.mocked(useRbac).mockReturnValue(allowedRbac('ventas.read.all'));
        render(<FacturacionPanel />);
        expect(screen.queryByText(/acceso restringido/i)).not.toBeInTheDocument();
    });
});

describe('CandidatosPanel RBAC', () => {
    it('muestra "Acceso restringido" sin candidatos.read', () => {
        vi.mocked(useRbac).mockReturnValue(deniedRbac);
        render(<CandidatosPanel />, { wrapper: Wrapper });
        expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
    });

    it('pasa el guard con candidatos.read', () => {
        vi.mocked(useRbac).mockReturnValue(allowedRbac('candidatos.read'));
        render(<CandidatosPanel />, { wrapper: Wrapper });
        expect(screen.queryByText(/acceso restringido/i)).not.toBeInTheDocument();
    });
});

describe('VentasPanel RBAC', () => {
    it('muestra "Acceso restringido" sin ventas.read.all', () => {
        vi.mocked(useRbac).mockReturnValue(deniedRbac);
        render(<VentasPanel />, { wrapper: Wrapper });
        expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
    });

    it('pasa el guard con ventas.read.all', () => {
        vi.mocked(useRbac).mockReturnValue(allowedRbac('ventas.read.all'));
        render(<VentasPanel />, { wrapper: Wrapper });
        expect(screen.queryByText(/acceso restringido/i)).not.toBeInTheDocument();
    });
});
