/**
 * ScraperStatusPanel.rbac.test.jsx
 *
 * Verifica el guard RBAC del componente ScraperStatusPanel.
 * Después del fix 2026-08-03, requiere 'scraper.read' (supervisor+)
 * en lugar de 'admin.system.config' (admin only).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRbac } from '../../../shared/auth/useRbac';
import { useN8nQuery } from '../../../shared/hooks/useN8n';
import ScraperStatusPanel from './ScraperStatusPanel';

vi.mock('../../../shared/auth/useRbac', () => ({ useRbac: vi.fn() }));
vi.mock('../../../shared/hooks/useN8n', () => ({ useN8nQuery: vi.fn() }));

const allowedRbac = { can: vi.fn(() => true), canAll: vi.fn(() => true), canAny: vi.fn(() => true), permisos: ['scraper.read'], user: { id: 1, role: 'supervisor' } };
const deniedRbac  = { can: vi.fn(() => false), canAll: vi.fn(() => false), canAny: vi.fn(() => false), permisos: [], user: { id: 2, role: 'operador' } };

beforeEach(() => {
    // Mock useN8nQuery para evitar el fetch real — devolver data vacía
    vi.mocked(useN8nQuery).mockReturnValue({
        data: { scrapers: [], refreshed_at: new Date().toISOString() },
        isLoading: false, isError: false, refetch: vi.fn(),
    });
});

describe('ScraperStatusPanel RBAC', () => {
    it('muestra "Acceso restringido" cuando el user NO tiene scraper.read', () => {
        vi.mocked(useRbac).mockReturnValue(deniedRbac);
        render(<ScraperStatusPanel />);
        expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
    });

    it('renderiza el panel cuando el user tiene scraper.read', () => {
        vi.mocked(useRbac).mockReturnValue(allowedRbac);
        render(<ScraperStatusPanel />);
        expect(screen.queryByText(/acceso restringido/i)).not.toBeInTheDocument();
    });

    it('verifica que el permiso correcto es scraper.read (no admin.system.config legacy)', () => {
        vi.mocked(useRbac).mockReturnValue(allowedRbac);
        render(<ScraperStatusPanel />);
        expect(useRbac().can).toHaveBeenCalledWith('scraper.read');
        expect(useRbac().can).not.toHaveBeenCalledWith('admin.system.config');
    });
});
