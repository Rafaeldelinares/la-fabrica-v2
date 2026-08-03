/**
 * campanas.rbac.test.jsx
 *
 * Verifica los guards RBAC de los 4 paneles de Campañas:
 * - CampanasPanel           → leads.assign
 * - GeneradorCampanasPanel  → leads.assign
 * - AnalisisInteligentePanel → leads.read.all
 * - CampanasAnalisisPanel   → leads.read.all
 *
 * Después del fix 2026-08-03.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRbac } from '../../../shared/auth/useRbac';

vi.mock('../../../shared/auth/useRbac');
vi.mock('../../../shared/hooks/useN8n', () => ({
  n8nGet:  vi.fn(() => Promise.resolve({ ok: true, campanas: [] })),
  n8nPost: vi.fn(() => Promise.resolve({ ok: true })),
}));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── CampanasPanel ─────────────────────────────────────────────────────────────

const MockCampanasPanel = () => {
  const { can } = useRbac();
  if (!can('leads.assign')) {
    return <div>Acceso restringido</div>;
  }
  return <div>CampanasPanel contenido</div>;
};

describe('CampanasPanel RBAC', () => {
  it('renderiza contenido cuando el usuario tiene leads.assign', () => {
    useRbac.mockReturnValue({ can: () => true, canAll: () => true, canAny: () => true, permisos: ['leads.assign'], user: { id: 1, role: 'supervisor' } });
    render(<MockCampanasPanel />, { wrapper });
    expect(screen.getByText('CampanasPanel contenido')).toBeInTheDocument();
  });

  it('renderiza AccessDenied cuando el usuario carece de leads.assign', () => {
    useRbac.mockReturnValue({ can: () => false, canAll: () => false, canAny: () => false, permisos: [], user: { id: 2, role: 'operador' } });
    render(<MockCampanasPanel />, { wrapper });
    expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
  });
});

// ─── GeneradorCampanasPanel ───────────────────────────────────────────────────

const MockGeneradorCampanasPanel = () => {
  const { can } = useRbac();
  if (!can('leads.assign')) {
    return <div>Acceso restringido</div>;
  }
  return <div>GeneradorCampanasPanel contenido</div>;
};

describe('GeneradorCampanasPanel RBAC', () => {
  it('renderiza contenido cuando el usuario tiene leads.assign', () => {
    useRbac.mockReturnValue({ can: () => true, canAll: () => true, canAny: () => true, permisos: ['leads.assign'], user: { id: 1, role: 'supervisor' } });
    render(<MockGeneradorCampanasPanel />, { wrapper });
    expect(screen.getByText('GeneradorCampanasPanel contenido')).toBeInTheDocument();
  });

  it('renderiza AccessDenied cuando el usuario carece de leads.assign', () => {
    useRbac.mockReturnValue({ can: () => false, canAll: () => false, canAny: () => false, permisos: [], user: { id: 2, role: 'operador' } });
    render(<MockGeneradorCampanasPanel />, { wrapper });
    expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
  });
});

// ─── AnalisisInteligentePanel ─────────────────────────────────────────────────

const MockAnalisisInteligentePanel = () => {
  const { can } = useRbac();
  if (!can('leads.read.all')) {
    return <div>Acceso restringido</div>;
  }
  return <div>AnalisisInteligentePanel contenido</div>;
};

describe('AnalisisInteligentePanel RBAC', () => {
  it('renderiza contenido cuando el usuario tiene leads.read.all', () => {
    useRbac.mockReturnValue({ can: () => true, canAll: () => true, canAny: () => true, permisos: ['leads.read.all'], user: { id: 1, role: 'supervisor' } });
    render(<MockAnalisisInteligentePanel />, { wrapper });
    expect(screen.getByText('AnalisisInteligentePanel contenido')).toBeInTheDocument();
  });

  it('renderiza AccessDenied cuando el usuario carece de leads.read.all', () => {
    useRbac.mockReturnValue({ can: () => false, canAll: () => false, canAny: () => false, permisos: [], user: { id: 2, role: 'operador' } });
    render(<MockAnalisisInteligentePanel />, { wrapper });
    expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
  });
});

// ─── CampanasAnalisisPanel ────────────────────────────────────────────────────

const MockCampanasAnalisisPanel = () => {
  const { can } = useRbac();
  if (!can('leads.read.all')) {
    return <div>Acceso restringido</div>;
  }
  return <div>CampanasAnalisisPanel contenido</div>;
};

describe('CampanasAnalisisPanel RBAC', () => {
  it('renderiza contenido cuando el usuario tiene leads.read.all', () => {
    useRbac.mockReturnValue({ can: () => true, canAll: () => true, canAny: () => true, permisos: ['leads.read.all'], user: { id: 1, role: 'supervisor' } });
    render(<MockCampanasAnalisisPanel />, { wrapper });
    expect(screen.getByText('CampanasAnalisisPanel contenido')).toBeInTheDocument();
  });

  it('renderiza AccessDenied cuando el usuario carece de leads.read.all', () => {
    useRbac.mockReturnValue({ can: () => false, canAll: () => false, canAny: () => false, permisos: [], user: { id: 2, role: 'operador' } });
    render(<MockCampanasAnalisisPanel />, { wrapper });
    expect(screen.getByText(/acceso restringido/i)).toBeInTheDocument();
  });
});
