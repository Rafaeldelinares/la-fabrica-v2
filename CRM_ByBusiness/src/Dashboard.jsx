import React, { useState } from 'react';
import { useAuth } from './modules/auth/AuthContext';
import Layout from './shared/layout/Layout';
import WorkBody from './shared/layout/WorkBody';

const Dashboard = () => {
  const { registerActivity, user } = useAuth();
  const role = user?.role;
  const defaultTab = role === 'admin' || role === 'supervisor' ? 'DASHBOARD_EXE'
    : 'NEXT_CALL';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabTitles = {
    'DASHBOARD_EXE': 'CUADRO DE MANDO GLOBAL',
    'NEXT_CALL': 'PRÓXIMA LLAMADA',
    'TEAM_AGENDA': 'AGENDA DE EQUIPO',
    'LEADS_MGMT': 'GESTIÓN DE LEADS',
    'AUDIT': 'AUDITORÍA DE SISTEMA',
    'RESULTS': 'MIS RESULTADOS',
    'PERSONAL_AGENDA': 'MI AGENDA',
    'WHATSAPP_PANEL': 'PANEL DE COMUNICACIONES'
  };

  return (
    <div onMouseMove={registerActivity} onClick={registerActivity} onKeyPress={registerActivity}>
      <Layout
        title={tabTitles[activeTab] || activeTab}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      >
        <WorkBody activeTab={activeTab} setActiveTab={setActiveTab} />
      </Layout>
    </div>
  );
};

// Helper Components removed (SidebarItem)
export default Dashboard;
