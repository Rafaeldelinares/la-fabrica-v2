/**
 * useRbac.test.jsx
 *
 * Tests reales para el hook useRbac.
 * Cubre: permisos por rol (admin/operador/supervisor), can/canAll/canAny,
 * fallback a 'operador' cuando user no tiene rol, permisos de admin expansivos.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mocks — paths deben coincidir con imports del SUT
vi.mock('../../modules/auth/AuthContext', () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from '../../modules/auth/AuthContext';
import { useRbac } from './useRbac';

/**
 * Componente de testing que ejecuta useRbac y renderiza los valores como JSON.
 * Permite inspeccionar el resultado del hook desde los tests.
 */
function RbacProbe() {
    const rbac = useRbac();
    return (
        <div data-testid="probe">
            <span data-testid="can-leads-read-own">{String(rbac.can('leads.read.own'))}</span>
            <span data-testid="can-admin-users">{String(rbac.can('admin.users.manage'))}</span>
            <span data-testid="can-reportes">{String(rbac.can('reportes.read'))}</span>
            <span data-testid="can-ventas-create">{String(rbac.can('ventas.create'))}</span>
            <span data-testid="can-nonexistent">{String(rbac.can('does.not.exist'))}</span>
            <span data-testid="can-all-read-own-write">{String(rbac.canAll('leads.read.own', 'leads.update.status'))}</span>
            <span data-testid="can-all-mixed">{String(rbac.canAll('leads.read.own', 'admin.users.manage'))}</span>
            <span data-testid="can-any-read-admin">{String(rbac.canAny('leads.read.own', 'admin.users.manage'))}</span>
            <span data-testid="can-any-none">{String(rbac.canAny('xxx', 'yyy'))}</span>
            <span data-testid="permisos-count">{rbac.permisos.length}</span>
            <span data-testid="permisos">{JSON.stringify(rbac.permisos)}</span>
            <span data-testid="user-id">{rbac.user?.id ?? 'null'}</span>
        </div>
    );
}

describe('useRbac', () => {

    describe('admin role', () => {
        it('can() retorna true para cualquier permiso', () => {
            vi.mocked(useAuth).mockReturnValue({ user: { id: 1, role: 'admin' } });
            render(<RbacProbe />);
            expect(screen.getByTestId('can-leads-read-own')).toHaveTextContent('true');
            expect(screen.getByTestId('can-admin-users')).toHaveTextContent('true');
            expect(screen.getByTestId('can-reportes')).toHaveTextContent('true');
            expect(screen.getByTestId('can-ventas-create')).toHaveTextContent('true');
        });

        it('expande permisos a TODOS los de ALL_PERMISSIONS', async () => {
            // Importamos ALL_PERMISSIONS indirectamente para comparar count
            vi.mocked(useAuth).mockReturnValue({ user: { id: 1, role: 'admin' } });
            const { ALL_PERMISSIONS } = await import('./rbac');
            render(<RbacProbe />);
            expect(screen.getByTestId('permisos-count')).toHaveTextContent(String(ALL_PERMISSIONS.length));
        });
    });

    describe('operador role', () => {
        beforeEach(() => {
            vi.mocked(useAuth).mockReturnValue({ user: { id: 2, role: 'operador' } });
        });

        it('tiene leads.read.own pero NO admin.users.manage', () => {
            render(<RbacProbe />);
            expect(screen.getByTestId('can-leads-read-own')).toHaveTextContent('true');
            expect(screen.getByTestId('can-admin-users')).toHaveTextContent('false');
            expect(screen.getByTestId('can-reportes')).toHaveTextContent('false'); // solo supervisor+
        });

        it('permisos contiene los esperados para operador', () => {
            render(<RbacProbe />);
            const permisos = JSON.parse(screen.getByTestId('permisos').textContent);
            expect(permisos).toContain('leads.read.own');
            expect(permisos).toContain('leads.update.status');
            expect(permisos).toContain('ventas.create');
            expect(permisos).not.toContain('admin.users.manage');
        });
    });

    describe('supervisor role', () => {
        it('tiene reportes.read pero NO admin.users.manage', () => {
            vi.mocked(useAuth).mockReturnValue({ user: { id: 3, role: 'supervisor' } });
            render(<RbacProbe />);
            expect(screen.getByTestId('can-reportes')).toHaveTextContent('true');
            expect(screen.getByTestId('can-admin-users')).toHaveTextContent('false');
            expect(screen.getByTestId('can-leads-read-own')).toHaveTextContent('false'); // solo all, no own
        });
    });

    describe('null/undefined user', () => {
        it('can() retorna false para cualquier permiso', () => {
            vi.mocked(useAuth).mockReturnValue({ user: null });
            render(<RbacProbe />);
            expect(screen.getByTestId('can-leads-read-own')).toHaveTextContent('false');
            expect(screen.getByTestId('can-admin-users')).toHaveTextContent('false');
        });

        it('permisos es array vacío', () => {
            vi.mocked(useAuth).mockReturnValue({ user: null });
            render(<RbacProbe />);
            expect(screen.getByTestId('permisos-count')).toHaveTextContent('0');
            expect(screen.getByTestId('user-id')).toHaveTextContent('null');
        });
    });

    describe('user sin role definido cae a operador', () => {
        it('fallback a permisos de operador', () => {
            vi.mocked(useAuth).mockReturnValue({ user: { id: 4 } }); // sin role
            render(<RbacProbe />);
            expect(screen.getByTestId('can-leads-read-own')).toHaveTextContent('true');
            expect(screen.getByTestId('can-admin-users')).toHaveTextContent('false');
        });

        it('también acepta user.rol (variante en español)', () => {
            vi.mocked(useAuth).mockReturnValue({ user: { id: 5, rol: 'supervisor' } });
            render(<RbacProbe />);
            expect(screen.getByTestId('can-reportes')).toHaveTextContent('true');
        });
    });

    describe('canAll / canAny', () => {
        it('canAll retorna true solo si TODOS los permisos se cumplen (admin)', () => {
            vi.mocked(useAuth).mockReturnValue({ user: { id: 1, role: 'admin' } });
            render(<RbacProbe />);
            expect(screen.getByTestId('can-all-read-own-write')).toHaveTextContent('true');
            expect(screen.getByTestId('can-all-mixed')).toHaveTextContent('true'); // admin tiene ambos
        });

        it('canAll retorna false si al menos uno falla (operador)', () => {
            vi.mocked(useAuth).mockReturnValue({ user: { id: 2, role: 'operador' } });
            render(<RbacProbe />);
            expect(screen.getByTestId('can-all-read-own-write')).toHaveTextContent('true'); // operador tiene ambos
            expect(screen.getByTestId('can-all-mixed')).toHaveTextContent('false'); // no admin
        });

        it('canAny retorna true si al menos UNO se cumple', () => {
            vi.mocked(useAuth).mockReturnValue({ user: { id: 2, role: 'operador' } });
            render(<RbacProbe />);
            expect(screen.getByTestId('can-any-read-admin')).toHaveTextContent('true'); // leads.read.own ✓
            expect(screen.getByTestId('can-any-none')).toHaveTextContent('false');
        });
    });

    describe('permisos inexistentes', () => {
        it('can() retorna false para permisos que no existen en ALL_PERMISSIONS', () => {
            vi.mocked(useAuth).mockReturnValue({ user: { id: 1, role: 'admin' } });
            render(<RbacProbe />);
            expect(screen.getByTestId('can-nonexistent')).toHaveTextContent('false');
        });
    });
});
