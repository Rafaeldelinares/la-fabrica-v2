import React, { Suspense, lazy } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../modules/auth/AuthContext';
import Sidebar from './Sidebar';
import RouteSkeleton from '../ui/RouteSkeleton';

// Lazy — all panels loaded on demand to keep initial bundle small.
// Previously 4 panels (DashboardPanel, OperatorDashboard, AgendaGlobalPanel,
// CarteraPanel, CampanasPanel) were eagerly imported. Converted to lazy to
// split the 602 kB initial bundle into route-level chunks.
const DashboardPanel    = lazy(() => import('../../modules/admin/dashboard/DashboardPanel'));
const OperatorDashboard = lazy(() => import('../../components/dashboard/OperatorDashboard'));
const AgendaGlobalPanel = lazy(() => import('../../modules/admin/agenda/AgendaGlobalPanel'));
const CarteraPanel      = lazy(() => import('../../modules/admin/cartera/CarteraPanel'));
const CampanasPanel     = lazy(() => import('../../modules/admin/campanas/CampanasPanel'));

const UsuariosList      = lazy(() => import('../../modules/admin/usuarios/UsuariosList'));
const WhatsAppPanel     = lazy(() => import('../../components/dashboard/WhatsAppPanel'));
const LeadsPanel        = lazy(() => import('../../modules/admin/leads/LeadsPanel'));
const LeadsLandingPanel = lazy(() => import('../../modules/admin/leads/LeadsLandingPanel'));
const CandidatosPanel   = lazy(() => import('../../modules/admin/candidatos/CandidatosPanel'));
const VentasPanel       = lazy(() => import('../../modules/admin/ventas/VentasPanel'));
const FacturacionPanel  = lazy(() => import('../../modules/admin/facturacion/FacturacionPanel'));
const AuditoriaPanel    = lazy(() => import('../../modules/admin/auditoria/AuditoriaPanel'));
const EntrenamientoPanel = lazy(() => import('../../modules/entrenamiento/EntrenamientoPanel'));
const SupervisorPanel   = lazy(() => import('../../modules/entrenamiento/SupervisorPanel'));
const GbpPanel          = lazy(() => import('../../modules/admin/gbp/GbpPanel'));
const GestoriaPanel     = lazy(() => import('../../modules/admin/facturacion/GestoriaPanel'));
const ScraperStatusPanel = lazy(() => import('../../modules/admin/scraper/ScraperStatusPanel'));
const ScraperConfigPanel = lazy(() => import('../../modules/admin/scraper/ScraperConfigPanel'));
const XiaomiCookiesPanel = lazy(() => import('../../modules/admin/scraper/XiaomiCookiesPanel'));
const BackupPanel = lazy(() => import('../../modules/admin/backup/BackupPanel'));
const AdminAuditPanel = lazy(() => import('../../modules/admin/auditoria/AdminAuditPanel'));

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
          <Suspense fallback={<RouteSkeleton variant="admin" />}>
            {/* Admin Views */}
            {activeTab === 'DASHBOARD_EXE' && <DashboardPanel />}
            {activeTab === 'AGENDA_GLOB' && <AgendaGlobalPanel />}
            {activeTab === 'MONITOR' && (
              <div className="flex flex-col gap-4 h-full">
                <ScraperStatusPanel />
                <ScraperConfigPanel />
                <XiaomiCookiesPanel />
              </div>
            )}
            {activeTab === 'LEADS_GESTON' && <LeadsLandingPanel />}
            {activeTab === 'LEADS_MGMT' && <LeadsPanel />}
            {activeTab === 'LEADS_LANDING' && <LeadsLandingPanel />}
            {activeTab === 'CANDIDATOS' && <CandidatosPanel />}
            {activeTab === 'USUARIOS' && <UsuariosList />}
            {activeTab === 'AUDITORIA' && <AuditoriaPanel />}
            {activeTab === 'BACKUP' && <BackupPanel />}
            {activeTab === 'AUDIT_NEW' && <AdminAuditPanel />}
            {activeTab === 'SCRAPER_CONFIG' && <ScraperConfigPanel />}
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
