/**
 * GbpInformeCompetencia.test.jsx
 *
 * Tests:
 *  1. Renderiza botón "Ver informe competitivo" para admin
 *  2. NO renderiza el botón si user no es admin (RBAC)
 *  3. Abre el modal al hacer click en el botón
 *  4. Muestra skeleton mientras carga
 *  5. Muestra iframe con PDF cuando carga
 *  6. Cierra el modal al click en X o botón Cerrar
 *  7. Cierra el modal al click en Cerrar
 *  8. Botón "Descargar PDF" tiene href válido
 *  9. Muestra mensaje de error cuando fetch falla
 *
 * @since 2026-08-13 (Phase 3 — crm-informe-pdf)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  FileText: vi.fn(({ className }) => <span data-testid="icon-filetext" className={className}>[FileText]</span>),
  Download: vi.fn(({ className }) => <span data-testid="icon-download" className={className}>[Download]</span>),
  X: vi.fn(({ className }) => <span data-testid="icon-x" className={className}>[X]</span>),
  ExternalLink: vi.fn(({ className }) => <span data-testid="icon-externallink" className={className}>[ExternalLink]</span>),
  AlertCircle: vi.fn(({ className }) => <span data-testid="icon-alertcircle" className={className}>[AlertCircle]</span>),
  Loader2: vi.fn(({ className }) => <span data-testid="icon-loader2" className={className}>[Loader2]</span>),
}));

// Mock useRbac
const mockCan = vi.fn();
vi.mock('../../../../../shared/auth/useRbac', () => ({
  useRbac: vi.fn(() => ({ can: mockCan })),
}));

// Mock useInformeCompetencia
vi.mock('./useInformeCompetencia', () => ({
  useInformeCompetencia: vi.fn(),
}));

// Mock env validation
vi.mock('../../../../../shared/utils/envValidation', () => ({
  validateEnvVar: vi.fn(() => 'https://n8n.example.com'),
}));

const { useInformeCompetencia } = await import('./useInformeCompetencia');

import GbpInformeCompetencia from './GbpInformeCompetencia';

describe('GbpInformeCompetencia', () => {
  // Default mock return value (can be overridden per test)
  const defaultMockReturn = {
    pdfUrl: null,
    isLoading: false,
    error: null,
    fetchInformePDF: vi.fn(),
    descargarPDF: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(mockCan).mockReset();
    vi.mocked(useInformeCompetencia).mockReturnValue(defaultMockReturn);
  });

  // ─── 1. Renderiza botón para admin ───────────────────────────────────────

  it('renderiza el botón "Ver informe competitivo" cuando user es admin', () => {
    mockCan.mockReturnValue(true);
    render(<GbpInformeCompetencia clienteId="123" clienteNombre="Manaaki Fisio" />);
    expect(screen.getByText('Ver informe competitivo')).toBeInTheDocument();
  });

  // ─── 2. RBAC: no renderiza si no es admin ────────────────────────────────

  it('NO renderiza el botón cuando user no es admin', () => {
    mockCan.mockReturnValue(false);
    const { container } = render(<GbpInformeCompetencia clienteId="123" />);
    expect(container.firstChild).toBeNull();
  });

  // ─── 3. Abre el modal al click ──────────────────────────────────────────

  it('abre el modal al hacer click en el botón', async () => {
    mockCan.mockReturnValue(true);
    const user = userEvent.setup();
    render(<GbpInformeCompetencia clienteId="123" clienteNombre="Manaaki Fisio" />);
    await user.click(screen.getByText('Ver informe competitivo'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Informe competitivo/)).toBeInTheDocument();
  });

  // ─── 4. Loading button state ───────────────────────────────────────────

  it('muestra estado disabled en el botón cuando isLoading=true', () => {
    mockCan.mockReturnValue(true);
    vi.mocked(useInformeCompetencia).mockReturnValue({
      ...defaultMockReturn,
      isLoading: true,
    });
    render(<GbpInformeCompetencia clienteId="123" clienteNombre="Test" />);
    const btn = screen.getByText('Ver informe competitivo');
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  // ─── 5. Muestra iframe con PDF cuando carga ───────────────────────────

  it('muestra iframe con PDF cuando pdfUrl está disponible', async () => {
    mockCan.mockReturnValue(true);
    const fakeUrl = 'blob:http://localhost:5173/fake-uuid';
    vi.mocked(useInformeCompetencia).mockReturnValue({
      ...defaultMockReturn,
      pdfUrl: fakeUrl,
    });
    const user = userEvent.setup();
    render(<GbpInformeCompetencia clienteId="123" clienteNombre="Test" />);
    await user.click(screen.getByText('Ver informe competitivo'));
    const iframe = screen.getByTitle('Informe competitivo — Test');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', fakeUrl);
  });

  // ─── 6. Cierra el modal al click en X ────────────────────────────────

  it('cierra el modal al hacer click en X', async () => {
    mockCan.mockReturnValue(true);
    vi.mocked(useInformeCompetencia).mockReturnValue({
      ...defaultMockReturn,
      pdfUrl: 'blob:http://localhost/fake',
    });
    const user = userEvent.setup();
    render(<GbpInformeCompetencia clienteId="123" clienteNombre="Test" />);
    await user.click(screen.getByText('Ver informe competitivo'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const closeBtn = dialog.querySelector('button[aria-label="Cerrar modal"]');
    await user.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ─── 7. Cierra el modal al click en Cerrar ────────────────────────────

  it('cierra el modal al hacer click en Cerrar', async () => {
    mockCan.mockReturnValue(true);
    vi.mocked(useInformeCompetencia).mockReturnValue({
      ...defaultMockReturn,
      pdfUrl: 'blob:http://localhost/fake',
    });
    const user = userEvent.setup();
    render(<GbpInformeCompetencia clienteId="123" />);
    await user.click(screen.getByText('Ver informe competitivo'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByText('Cerrar'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ─── 8. Descargar PDF link tiene href válido ─────────────────────────

  it('el botón Descargar PDF tiene href hacia el blob URL', async () => {
    mockCan.mockReturnValue(true);
    const fakeUrl = 'blob:http://localhost:5173/fake-uuid-123';
    vi.mocked(useInformeCompetencia).mockReturnValue({
      ...defaultMockReturn,
      pdfUrl: fakeUrl,
    });
    const user = userEvent.setup();
    render(<GbpInformeCompetencia clienteId="999" clienteNombre="Test" />);
    await user.click(screen.getByText('Ver informe competitivo'));
    const downloadLink = screen.getByText('Descargar PDF').closest('a');
    expect(downloadLink).toHaveAttribute('href', fakeUrl);
    expect(downloadLink).toHaveAttribute('download', 'informe_competitivo_999.pdf');
  });

  // ─── 9. Muestra error state ─────────────────────────────────────────

  it('muestra mensaje de error cuando fetch falla', async () => {
    mockCan.mockReturnValue(true);
    vi.mocked(useInformeCompetencia).mockReturnValue({
      ...defaultMockReturn,
      error: 'No se encontró informe para cliente_id=999',
    });
    const user = userEvent.setup();
    render(<GbpInformeCompetencia clienteId="999" clienteNombre="Test" />);
    await user.click(screen.getByText('Ver informe competitivo'));
    expect(screen.getByText(/No se encontró informe/)).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });
});
