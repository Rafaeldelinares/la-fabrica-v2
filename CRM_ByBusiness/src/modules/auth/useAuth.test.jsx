/**
 * useAuth.test.jsx
 *
 * Test mínimo del hook useAuth vía el AuthProvider real.
 * Cubre: AuthProvider expone user/login/logout al contexto y useAuth
 * los retorna correctamente. El test de "fuera del provider" se omite
 * porque AuthContext no se exporta (solo useAuth, que ya lo cubre).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
    const auth = useAuth();
    return (
        <div>
            <span data-testid="user-id">{auth?.user?.id ?? 'no-user'}</span>
            <span data-testid="role">{auth?.user?.role ?? 'no-role'}</span>
            <span data-testid="has-login">{typeof auth?.login}</span>
            <span data-testid="has-logout">{typeof auth?.logout}</span>
            <button onClick={() => auth?.login?.({ id: 99, email: 'test@test.com', role: 'admin' })}>
                login-99
            </button>
            <button onClick={() => auth?.logout?.()}>logout</button>
        </div>
    );
}

beforeEach(() => {
    localStorage.clear();
});

describe('useAuth vía AuthProvider', () => {
    it('AuthProvider expone user/login/logout al contexto', () => {
        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>
        );

        // Sin sesión previa → user es null
        expect(screen.getByTestId('user-id')).toHaveTextContent('no-user');
        expect(screen.getByTestId('has-login')).toHaveTextContent('function');
        expect(screen.getByTestId('has-logout')).toHaveTextContent('function');
    });

    it('login() setea user en el contexto y persiste en localStorage', async () => {
        const user = userEvent.setup();
        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>
        );

        await user.click(screen.getByRole('button', { name: /login-99/i }));

        expect(screen.getByTestId('user-id')).toHaveTextContent('99');
        expect(screen.getByTestId('role')).toHaveTextContent('admin');

        const stored = JSON.parse(localStorage.getItem('op_user'));
        expect(stored).toMatchObject({ id: 99, role: 'admin', email: 'test@test.com' });
    });

    it('logout() limpia user del contexto y de localStorage', async () => {
        const user = userEvent.setup();
        // Pre-poblar localStorage con sesión
        localStorage.setItem('op_user', JSON.stringify({ id: 1, role: 'operador' }));

        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>
        );

        // Antes: user cargado desde localStorage
        expect(screen.getByTestId('user-id')).toHaveTextContent('1');

        await user.click(screen.getByRole('button', { name: /logout/i }));

        expect(screen.getByTestId('user-id')).toHaveTextContent('no-user');
        expect(localStorage.getItem('op_user')).toBeNull();
    });

    it('AuthProvider carga user existente desde localStorage al montar', () => {
        localStorage.setItem('op_user', JSON.stringify({ id: 77, role: 'supervisor', email: 's@b.com' }));

        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>
        );

        expect(screen.getByTestId('user-id')).toHaveTextContent('77');
        expect(screen.getByTestId('role')).toHaveTextContent('supervisor');
    });
});
