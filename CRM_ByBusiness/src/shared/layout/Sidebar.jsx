import React from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../modules/auth/AuthContext';
import {
  LayoutDashboard,
  Users,
  Database,
  ShieldCheck,
  PhoneCall,
  BarChart2,
  Calendar,
  UserCheck,
  TrendingUp,
  Receipt,
  GraduationCap,
  MapPin,
  Briefcase,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose, activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const role = user?.role || 'operador';

  const adminMenu = [
    { name: 'Dashboard Global', icon: <LayoutDashboard size={20} />, id: 'DASHBOARD_EXE' },
    { name: 'Agenda',           icon: <Calendar size={20} />,        id: 'AGENDA_GLOB' },
    { name: 'Clientes',         icon: <Briefcase size={20} />,       id: 'CARTERA' },
    { name: 'Facturación',      icon: <Receipt size={20} />,         id: 'FACTURACION' },
    { name: 'Ventas',           icon: <TrendingUp size={20} />,      id: 'VENTAS' },
    { name: 'Gestión de Leads', icon: <Database size={20} />,        id: 'LEADS_MGMT' },
    { name: 'Auditoría',        icon: <ShieldCheck size={20} />,     id: 'AUDITORIA' },
    { name: 'Usuarios',         icon: <Users size={20} />,           id: 'USUARIOS' },
    { name: 'Candidatos RRHH',  icon: <UserCheck size={20} />,       id: 'CANDIDATOS' },
    { name: 'Entrenamiento',    icon: <GraduationCap size={20} />,   id: 'ENTRENAMIENTO' },
    { name: 'Google Business',  icon: <MapPin size={20} />,          id: 'GBP_MGMT' },
  ];

  const supervisorMenu = [
    { name: 'Dashboard Global',    icon: <LayoutDashboard size={20} />, id: 'DASHBOARD_EXE' },
    { name: 'Entrenamiento',       icon: <GraduationCap size={20} />,   id: 'ENTRENAMIENTO' },
  ];

  const operatorMenu = [
    { name: 'Mi Próxima Llamada', icon: <PhoneCall size={20} />, id: 'NEXT_CALL' },
    { name: 'Mis Resultados', icon: <BarChart2 size={20} />, id: 'RESULTS' },
    { name: 'Agenda Personal', icon: <Calendar size={20} />, id: 'PERSONAL_AGENDA' },
  ];

  const practicasMenu = [
    { name: 'Modo Práctica',  icon: <PhoneCall size={20} />,     id: 'NEXT_CALL' },
    { name: 'Mi Progreso',    icon: <GraduationCap size={20} />, id: 'ENTRENAMIENTO' },
  ];

  const menuItems = role === 'admin'
    ? adminMenu
    : role === 'supervisor'
    ? supervisorMenu
    : role === 'en_practicas'
    ? practicasMenu
    : operatorMenu;

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#020617] border-r border-slate-800 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <button className="md:hidden text-slate-400 hover:text-white" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 768) onClose();
              }}
              className={`flex items-center w-full px-4 py-3 rounded-sm transition-all group ${activeTab === item.id
                  ? 'bg-[#D00000]/10 text-white border-l-4 border-[#D00000]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
            >
              <div className={`mr-4 transition-colors ${activeTab === item.id ? 'text-[#D00000]' : 'text-slate-500 group-hover:text-[#D00000]'
                }`}>
                {item.icon}
              </div>
              <span className="text-sm font-medium">{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Footer — versión */}
        <div className="p-4 mt-auto border-t border-slate-800">
          <p className="text-[10px] text-slate-700 font-mono tracking-widest text-center">V 1.1.0</p>
        </div>
      </div>
    </div>
  );
};

Sidebar.propTypes = {
  isOpen:       PropTypes.bool.isRequired,
  onClose:      PropTypes.func.isRequired,
  activeTab:    PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
};

export default Sidebar;
