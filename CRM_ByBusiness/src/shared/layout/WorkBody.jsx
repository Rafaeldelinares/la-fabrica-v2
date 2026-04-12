import React, { Suspense, lazy } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../modules/auth/AuthContext';
import Sidebar from './Sidebar';
// Eager — default views, must render immediately
import DashboardPanel from '../../modules/admin/dashboard/DashboardPanel';
import OperatorDashboard from '../../components/dashboard/OperatorDashboard';

// Lazy — loaded only when the user navigates to that tab
const UsuariosList      = lazy(() => import('../../modules/admin/usuarios/UsuariosList'));
const WhatsAppPanel     = lazy(() => import('../../components/dashboard/WhatsAppPanel'));
const LeadsPanel        = lazy(() => import('../../modules/admin/leads/LeadsPanel'));
const LeadsLandingPanel = lazy(() => import('../../modules/admin/leads/LeadsLandingPanel'));
const CandidatosPanel   = lazy(() => import('../../modules/admin/candidatos/CandidatosPanel'));
const VentasPanel       = lazy(() => import('../../modules/admin/ventas/VentasPanel'));
const FacturacionPanel  = lazy(() => import('../../modules/admin/facturacion/FacturacionPanel'));
import AgendaGlobalPanel from '../../modules/admin/agenda/AgendaGlobalPanel';
const AuditoriaPanel    = lazy(() => import('../../modules/admin/auditoria/AuditoriaPanel'));
const EntrenamientoPanel = lazy(() => import('../../modules/entrenamiento/EntrenamientoPanel'));
const SupervisorPanel   = lazy(() => import('../../modules/entrenamiento/SupervisorPanel'));
const GbpPanel          = lazy(() => import('../../modules/admin/gbp/GbpPanel'));
import CarteraPanel from '../../modules/admin/cartera/CarteraPanel';
import CampanasPanel from '../../modules/admin/campanas/CampanasPanel';
const GestoriaPanel     = lazy(() => import('../../modules/admin/facturacion/GestoriaPanel'));

/** Skeleton Navy Industrial mostrado mientras un panel lazy está cargando. */
const PanelSkeleton = () => (
  <div className="flex flex-col gap-3 p-2">
    <div className="h-6 w-48 bg-slate-800/60 rounded-sm animate-pulse" />
    <div className="h-32 bg-slate-800/40 rounded-sm animate-pulse" />
    <div className="h-32 bg-slate-800/40 rounded-sm animate-pulse" />
  </div>
);

/**
 * Contenedor principal de la zona de trabajo del CRM.
 * Renderiza el Sidebar y el panel activo según activeTab.
 * Los paneles secundarios se cargan de forma lazy para reducir el bundle inicial.
 *
 * @param {{ activeTab: string, setActiveTab: Function }} props
 */
const WorkBody = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  // Hide inner sidebar in Tunnel Mode (NEXT_CALL) — but keep it for en_practicas (they only have 2 items)
  const isTunnelMode = activeTab === 'NEXT_CALL' && user?.role !== 'en_practicas';

  return (
    <div className="h-full mx-4 my-4 p-4 bg-slate-950/30 backdrop-blur border border-slate-800/30 rounded-sm relative overflow-hidden flex gap-4 shadow-xl">
      {/* WORKBODY CHASSIS GRID (Subtler) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none rounded-sm"></div>

      {/* MODULE 1: SIDEBAR / COCKPIT */}
      {!isTunnelMode && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}

      {/* MODULE 2: VIEWER */}
      <div className={`flex-1 bg-slate-900/50 backdrop-blur border border-slate-800/50 relative rounded-sm shadow-2xl ${isTunnelMode ? 'p-0' : 'p-6'} overflow-hidden`}>
        {/* Viewer Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none rounded-sm"></div>

        <div className="relative z-10 h-full overflow-y-auto custom-scrollbar p-6">
          <Suspense fallback={<PanelSkeleton />}>
            {/* Admin Views */}
            {activeTab === 'DASHBOARD_EXE' && <DashboardPanel />}
            {activeTab === 'AGENDA_GLOB' && <AgendaGlobalPanel />}
            {activeTab === 'MONITOR' && (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-sm">
      <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-slate-800 flex items-center justify-center">
        <svg className="w-8 h-8 text-slate-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-2">En Construcción</h2>
      <p className="text-sm text-slate-400 max-w-md">
        El panel de Monitorización Real-Time está en desarrollo.
        <br />
        <span className="text-xs text-slate-500 mt-2 block">Disponible próximamente</span>
      </p>
    </div>
  </div>
)}
            {activeTab === 'LEADS_MGMT' && <LeadsPanel />}
            {activeTab === 'LEADS_LANDING' && <LeadsLandingPanel />}
            {activeTab === 'CANDIDATOS' && <CandidatosPanel />}
            {activeTab === 'USUARIOS' && <UsuariosList />}
            {activeTab === 'AUDITORIA' && <AuditoriaPanel />}
            {activeTab === 'VENTAS' && <VentasPanel />}
            {activeTab === 'FACTURACION' && <FacturacionPanel />}
            {activeTab === 'GESTORIA' && <GestoriaPanel />}

            {/* Operator Views — Modo Túnel: Solo NEXT_CALL con las 3 zonas */}
            {activeTab === 'NEXT_CALL' && <OperatorDashboard />}

            {/* Training Views */}
            {activeTab === 'ENTRENAMIENTO' && (
              user?.role === 'en_practicas'
                ? <EntrenamientoPanel user={user} />
                : <SupervisorPanel user={user} />
            )}

            {activeTab === 'GBP_MGMT' && <GbpPanel />}
            {activeTab === 'CARTERA' && <CarteraPanel />}
            {activeTab === 'CAMPAÑAS' && <CampanasPanel />}

            {/* Common Views */}
            {activeTab === 'WHATSAPP_PANEL' && <WhatsAppPanel />}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

WorkBody.propTypes = {
  /** Tab activo que determina qué panel se renderiza. */
  activeTab:    PropTypes.string.isRequired,
  /** Callback para cambiar el tab activo desde paneles internos. */
  setActiveTab: PropTypes.func.isRequired,
};

export default WorkBody;
