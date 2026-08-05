/**
 * ClienteSidePanel.test.jsx
 *
 * Tests reales para el componente ClienteSidePanel.
 * Cubre: estado inicial sin clienteId, loading state, render de campos,
 * "Cliente no encontrado", error de fetch, close button, backdrop click,
 * link "Ver ficha completa".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../shared/hooks/useN8n', () => ({
    n8nGet: vi.fn(),
    n8nPost: vi.fn(),
}));

import { n8nGet } from '../../../shared/hooks/useN8n';
import ClienteSidePanel from './ClienteSidePanel';

const mockCliente = {
    nombre_comercial: 'Acme Corp',
    telefono: '+34912345678',
    email: 'contacto@acme.com',
    estado: 'activo',
    gestor_nombre: 'Juan Pérez',
    operador_captacion_nombre: 'María López',
    created_at: '2026-01-15T10:00:00Z',
};

beforeEach(() => {
    vi.mocked(n8nGet).mockResolvedValue({ ok: true, clientes: [mockCliente] });
});

/** Crea un QueryClient aislado para cada test (sin retries para no enmascarar errores). */
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
    },
});

/** Renderiza el componente envuelto en QueryClientProvider para que useQuery funcione. */
const renderWithProviders = (ui) => {
    const queryClient = createTestQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
};

describe('ClienteSidePanel', () => {

    describe('clienteId no proporcionado', () => {
        it('no muestra loading state', () => {
            renderWithProviders(<ClienteSidePanel clienteId={null} onClose={vi.fn()} />);
            expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument();
        });

        it('no muestra campos del cliente', () => {
            renderWithProviders(<ClienteSidePanel clienteId={null} onClose={vi.fn()} />);
            expect(screen.queryByText(/nombre comercial/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/acme corp/i)).not.toBeInTheDocument();
        });
    });

    describe('render durante carga', () => {
        it('muestra skeleton mientras resuelve la promesa', async () => {
            vi.mocked(n8nGet).mockReturnValue(new Promise(() => {})); // nunca resuelve
            const { container } = renderWithProviders(<ClienteSidePanel clienteId={123} onClose={vi.fn()} />);
            // El skeleton tiene clases 'animate-pulse' y bg-slate-800
            const skeleton = container.querySelector('.animate-pulse');
            expect(skeleton).toBeInTheDocument();
        });
    });

    describe('render con datos del cliente', () => {
        it('renderiza nombre comercial, teléfono, email y estado', async () => {
            renderWithProviders(<ClienteSidePanel clienteId={123} onClose={vi.fn()} />);

            expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
            expect(screen.getByText('+34912345678')).toBeInTheDocument();
            expect(screen.getByText('contacto@acme.com')).toBeInTheDocument();
            expect(screen.getByText('activo')).toBeInTheDocument();
        });

        it('muestra link "Ver ficha completa" apuntando a /admin/cartera', async () => {
            renderWithProviders(<ClienteSidePanel clienteId={123} onClose={vi.fn()} />);
            await screen.findByText('Acme Corp');

            const link = screen.getByRole('link', { name: /ver ficha completa/i });
            expect(link).toHaveAttribute('href', '/admin/cartera');
        });
    });

    describe('manejo de errores', () => {
        it('muestra "Cliente no encontrado" cuando fetch devuelve clientes vacío', async () => {
            vi.mocked(n8nGet).mockResolvedValue({ ok: true, clientes: [] });
            renderWithProviders(<ClienteSidePanel clienteId={999} onClose={vi.fn()} />);

            expect(await screen.findByText(/cliente no encontrado/i)).toBeInTheDocument();
        });

        it('muestra mensaje de error cuando fetch falla con 500', async () => {
            vi.mocked(n8nGet).mockRejectedValue(new Error('Network error'));
            renderWithProviders(<ClienteSidePanel clienteId={123} onClose={vi.fn()} />);

            expect(await screen.findByText(/error al cargar datos/i)).toBeInTheDocument();
        });

        it('muestra "Cliente no encontrado" cuando fetch devuelve ok:false', async () => {
            vi.mocked(n8nGet).mockResolvedValue({ ok: false, clientes: [] });
            renderWithProviders(<ClienteSidePanel clienteId={123} onClose={vi.fn()} />);

            expect(await screen.findByText(/cliente no encontrado/i)).toBeInTheDocument();
        });
    });

    describe('cerrar panel', () => {
        it('llama onClose cuando se clickea el botón X del header', async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();
            renderWithProviders(<ClienteSidePanel clienteId={123} onClose={onClose} />);
            await screen.findByText('Acme Corp');

            const closeBtn = screen.getByRole('button', { name: '' });
            await user.click(closeBtn);

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('llama onClose cuando se clickea el backdrop', async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();
            const { container } = renderWithProviders(<ClienteSidePanel clienteId={123} onClose={onClose} />);
            await screen.findByText('Acme Corp');

            // El backdrop es el div absolute con bg-black/60
            const backdrop = container.querySelector('.bg-black\\/60');
            await user.click(backdrop);

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });
});
