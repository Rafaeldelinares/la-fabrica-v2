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
const MisResultados     = lazy(() => import('../../components/dashboard/MisResultados'));
const AgendaPersonal    = lazy(() => import('../../components/dashboard/AgendaPersonal'));
const CandidatosPanel   = lazy(() => import('../../modules/admin/candidatos/CandidatosPanel'));
const VentasPanel       = lazy(() => import('../../modules/admin/ventas/VentasPanel'));
const FacturacionPanel  = lazy(() => import('../../modules/admin/facturacion/FacturacionPanel'));
const AgendaGlobalPanel = lazy(() => import('../../modules/admin/agenda/AgendaGlobalPanel'));
const AuditoriaPanel    = lazy(() => import('../../modules/admin/auditoria/AuditoriaPanel'));
const EntrenamientoPanel = lazy(() => import('../../modules/entrenamiento/EntrenamientoPanel'));
const SupervisorPanel   = lazy(() => import('../../modules/entrenamiento/SupervisorPanel'));
const GbpPanel          = lazy(() => import('../../modules/admin/gbp/GbpPanel'));
const CarteraPanel      = lazy(() => import('../../modules/admin/cartera/CarteraPanel'));

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
            {activeTab === 'MONITOR' && <div className="text-white">MONITORIZACIÓN REAL-TIME (En construcción)</div>}
            {activeTab === 'LEADS_MGMT' && <LeadsPanel />}
            {activeTab === 'CANDIDATOS' && <CandidatosPanel />}
            {activeTab === 'USUARIOS' && <UsuariosList />}
            {activeTab === 'AUDITORIA' && <AuditoriaPanel />}
            {activeTab === 'VENTAS' && <VentasPanel />}
            {activeTab === 'FACTURACION' && <FacturacionPanel />}

            {/* Operator Views */}
            {activeTab === 'NEXT_CALL' && <OperatorDashboard />}
            {activeTab === 'RESULTS' && <MisResultados />}
            {activeTab === 'PERSONAL_AGENDA' && <AgendaPersonal />}
            {activeTab === 'MY_QUEUE' && <div className="text-white">MI COLA DIARIA (Modo Túnel)</div>}
            {activeTab === 'MY_ACTIONS' && <div className="text-white">MIS GESTIONES (Modo Túnel)</div>}
            {activeTab === 'MY_SALES' && <div className="text-white">MIS VENTAS (Modo Túnel)</div>}

            {/* Training Views */}
            {activeTab === 'ENTRENAMIENTO' && (
              user?.role === 'en_practicas'
                ? <EntrenamientoPanel user={user} />
                : <SupervisorPanel user={user} />
            )}

            {activeTab === 'GBP_MGMT' && <GbpPanel />}
            {activeTab === 'CARTERA' && <CarteraPanel />}

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
