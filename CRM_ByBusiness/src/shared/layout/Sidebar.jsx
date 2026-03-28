import React, { useState } from 'react';
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
  Building2,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose, activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const role = user?.role || 'operador';

  // Control de secciones expandidas
  const [expanded, setExpanded] = useState('NEGOCIO');

  const categories = [
    {
      id: 'MAIN',
      name: 'General',
      items: [
        { name: 'Dashboard', icon: <LayoutDashboard size={18} />, id: 'DASHBOARD_EXE' },
        { name: 'Agenda',    icon: <Calendar size={18} />,        id: 'AGENDA_GLOB' },
      ]
    },
    {
      id: 'NEGOCIO',
      name: 'Negocio / Cartera',
      items: [
        { name: 'Clientes',         icon: <Briefcase size={18} />,       id: 'CARTERA' },
        { name: 'Gestión Leads',    icon: <Database size={18} />,        id: 'LEADS_MGMT' },
        { name: 'Leads Landing',    icon: <Database size={18} />,        id: 'LEADS_LANDING' },
        { name: 'Ventas',           icon: <TrendingUp size={18} />,      id: 'VENTAS' },
        { name: 'Google Business',  icon: <MapPin size={18} />,          id: 'GBP_MGMT' },
      ]
    },
    {
      id: 'FINANZAS',
      name: 'Finanzas',
      items: [
        { name: 'Facturación',      icon: <Receipt size={18} />,         id: 'FACTURACION' },
        { name: 'Gestoría',         icon: <Building2 size={18} />,       id: 'GESTORIA' },
      ]
    },
    {
      id: 'SISTEMA',
      name: 'Sistema / Equipo',
      items: [
        { name: 'Candidatos RRHH',  icon: <UserCheck size={18} />,       id: 'CANDIDATOS' },
        { name: 'Usuarios',         icon: <Users size={18} />,           id: 'USUARIOS' },
        { name: 'Entrenamiento',    icon: <GraduationCap size={18} />,   id: 'ENTRENAMIENTO' },
        { name: 'Auditoría',        icon: <ShieldCheck size={18} />,     id: 'AUDITORIA' },
      ]
    }
  ];

  const operatorMenu = [
    { name: 'Mi Próxima Llamada', icon: <PhoneCall size={20} />, id: 'NEXT_CALL' },
    { name: 'Mis Resultados', icon: <BarChart2 size={20} />, id: 'RESULTS' },
    { name: 'Agenda Personal', icon: <Calendar size={20} />, id: 'PERSONAL_AGENDA' },
  ];

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  const renderItem = (item) => (
    <button
      key={item.id}
      onClick={() => {
        setActiveTab(item.id);
        if (window.innerWidth < 768) onClose();
      }}
      className={`flex items-center w-full px-4 py-2 mt-1 rounded-sm transition-all group ${activeTab === item.id
          ? 'bg-[#D00000]/10 text-white border-l-2 border-[#D00000]'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
        }`}
    >
      <div className={`mr-3 transition-colors ${activeTab === item.id ? 'text-[#D00000]' : 'text-slate-500 group-hover:text-[#D00000]'
        }`}>
        {item.icon}
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wider">{item.name}</span>
    </button>
  );

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#020617] border-r border-slate-800 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-6 border-b border-slate-800 bg-[#020617] shrink-0">
          <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Menú Principal</span>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {role === 'admin' ? (
            categories.map(cat => (
              <div key={cat.id} className="mb-2">
                <button
                  onClick={() => toggle(cat.id)}
                  className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors"
                >
                  {cat.name}
                  {expanded === cat.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                {expanded === cat.id && (
                  <div className="flex flex-col animate-in slide-in-from-top-1 duration-200">
                    {cat.items.map(renderItem)}
                  </div>
                )}
              </div>
            ))
          ) : (
            operatorMenu.map(renderItem)
          )}
        </nav>

        {/* Footer — versión */}
        <div className="p-4 mt-auto border-t border-slate-800 bg-[#020617] shrink-0">
          <p className="text-[9px] text-slate-800 font-mono tracking-widest text-center">LA FÁBRICA IA © V 1.3.0</p>
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

