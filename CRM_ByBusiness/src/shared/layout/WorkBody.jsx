import React from 'react';
import { useAuth } from '../../modules/auth/AuthContext';
import Sidebar from './Sidebar';
import DashboardPanel from '../../modules/admin/dashboard/DashboardPanel';
import Agenda from '../../components/dashboard/Agenda';
import Projects from '../../components/dashboard/Projects';
import UsuariosList from '../../modules/admin/usuarios/UsuariosList';
import OperatorDashboard from '../../components/dashboard/OperatorDashboard';
import WhatsAppPanel from '../../components/dashboard/WhatsAppPanel';
import LeadsPanel from '../../modules/admin/leads/LeadsPanel';
import MisResultados from '../../components/dashboard/MisResultados';
import AgendaPersonal from '../../components/dashboard/AgendaPersonal';
import CandidatosPanel from '../../modules/admin/candidatos/CandidatosPanel';
import VentasPanel from '../../modules/admin/ventas/VentasPanel';
import FacturacionPanel from '../../modules/admin/facturacion/FacturacionPanel';
import AgendaGlobalPanel from '../../modules/admin/agenda/AgendaGlobalPanel';
import AuditoriaPanel from '../../modules/admin/auditoria/AuditoriaPanel';
import EntrenamientoPanel from '../../modules/entrenamiento/EntrenamientoPanel';
import SupervisorPanel from '../../modules/entrenamiento/SupervisorPanel';
import GbpPanel from '../../modules/admin/gbp/GbpPanel';
import CarteraPanel from '../../modules/admin/cartera/CarteraPanel';

const WorkBody = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  // Hide inner sidebar in Tunnel Mode (NEXT_CALL) — but keep it for en_practicas (they only have 2 items)
  const isTunnelMode = activeTab === 'NEXT_CALL' && user?.role !== 'en_practicas';

  return (
    <div className="h-full mx-4 my-4 p-4 bg-slate-950/30 backdrop-blur border border-slate-800/30 rounded-xl relative overflow-hidden flex gap-4 shadow-xl">
      {/* WORKBODY CHASSIS GRID (Subtler) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none rounded-xl"></div>

      {/* MODULE 1: SIDEBAR / COCKPIT */}
      {!isTunnelMode && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}

      {/* MODULE 2: VIEWER */}
      <div className={`flex-1 bg-slate-900/50 backdrop-blur border border-slate-800/50 relative rounded-xl shadow-2xl ${isTunnelMode ? 'p-0' : 'p-6'} overflow-hidden`}>
        {/* Viewer Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none rounded-xl"></div>

        <div className="relative z-10 h-full overflow-y-auto custom-scrollbar p-6">
          {/* Dynamic Content Switching */}
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
        </div>
      </div>
    </div>
  );
};

export default WorkBody;
