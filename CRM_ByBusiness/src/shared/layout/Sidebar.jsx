import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { LayoutDashboard, Calendar, Briefcase, Target, Database, TrendingUp, MapPin, Receipt, Building2, UserCheck, Users, GraduationCap, ShieldCheck, PhoneCall, ChevronUp, ChevronDown, X, Activity, Settings } from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { can } from '../auth/rbac';

/**
 * Sidebar principal de navegación del CRM.
 * Filtra items según los permisos RBAC del usuario:
 *   - admin ve todo.
 *   - supervisor ve leads/clientes/ventas/agenda en modo lectura.
 *   - operador ve solo leads/ventas/agenda propios.
 *   - en_practicas ve el menú de operador con trainingScope.
 *
 * Cada item del menú declara un permiso `requires`. Si el usuario no lo tiene,
 * el item se oculta.
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen - Si el sidebar está abierto (mobile)
 * @param {Function} props.onClose - Handler para cerrar el sidebar
 * @param {string}   props.activeTab - Tab actualmente seleccionado
 * @param {Function} props.setActiveTab - Handler para cambiar de tab
 */
const Sidebar = ({ isOpen, onClose, activeTab, setActiveTab }) => {
  const { user } = useAuth();

  const [expanded, setExpanded] = useState('NEGOCIO');

  // Items declarativos con permiso requerido. Filtrados por RBAC al render.
  const categories = [
    {
      id: 'MAIN',
      name: 'General',
      items: [
        { name: 'Dashboard', icon: <LayoutDashboard size={18} />, id: 'DASHBOARD_EXE', requires: null },
        { name: 'Agenda',    icon: <Calendar size={18} />,        id: 'AGENDA_GLOB',    requires: 'agenda.read.all' },
      ]
    },
    {
      id: 'NEGOCIO',
      name: 'Negocio / Cartera',
      items: [
        { name: 'Clientes',         icon: <Briefcase size={18} />,       id: 'CARTERA',         requires: 'clientes.read.all' },
        { name: 'Campañas',         icon: <Target size={18} />,          id: 'CAMPAÑAS',        requires: 'leads.read.all' },
        { name: 'Gestión Leads',    icon: <Database size={18} />,        id: 'LEADS_MGMT',      requires: 'leads.read.all' },
        { name: 'Leads Landing',    icon: <Database size={18} />,        id: 'LEADS_LANDING',   requires: 'leads.read.all' },
        { name: 'Ventas',           icon: <TrendingUp size={18} />,      id: 'VENTAS',          requires: 'ventas.read.all' },
        { name: 'Google Business',  icon: <MapPin size={18} />,          id: 'GBP_MGMT',        requires: 'leads.read.all' },
      ]
    },
    {
      id: 'FINANZAS',
      name: 'Finanzas',
      items: [
        { name: 'Facturación',      icon: <Receipt size={18} />,         id: 'FACTURACION',     requires: 'clientes.read.all' },
        { name: 'Gestoría',         icon: <Building2 size={18} />,       id: 'GESTORIA',        requires: 'clientes.read.all' },
      ]
    },
    {
      id: 'SISTEMA',
      name: 'Sistema / Equipo',
      items: [
        { name: 'Candidatos RRHH',  icon: <UserCheck size={18} />,       id: 'CANDIDATOS',      requires: 'admin.users.manage' },
        { name: 'Usuarios',         icon: <Users size={18} />,           id: 'USUARIOS',        requires: 'admin.users.manage' },
        { name: 'Entrenamiento',    icon: <GraduationCap size={18} />,   id: 'ENTRENAMIENTO',   requires: 'admin.users.manage' },
        { name: 'Auditoría',        icon: <ShieldCheck size={18} />,     id: 'AUDITORIA',       requires: 'reportes.read' },
        { name: 'Monitor Scrapers',   icon: <Activity size={18} />,       id: 'MONITOR',         requires: 'admin.system.config' },
        { name: 'Respaldos',         icon: <Database size={18} />,        id: 'BACKUP',          requires: 'admin.system.config' },
        { name: 'Auditoría Nueva',   icon: <ShieldCheck size={18} />,     id: 'AUDIT_NEW',       requires: 'reportes.read' },
        { name: 'Configuración Scrapers', icon: <Settings size={18} />,   id: 'SCRAPER_CONFIG',   requires: 'admin.system.config' },
      ]
    }
  ];

  const operatorMenu = [
    { name: 'Mi Próxima Llamada', icon: <PhoneCall size={20} />, id: 'NEXT_CALL' },
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

  // Filtrar items por permiso. Items con `requires: null` siempre se muestran.
  const visibleCategories = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => !item.requires || can(user, item.requires))
    })).filter(cat => cat.items.length > 0);
  }, [user]);

  const isOperador = user?.role === 'operador' || user?.role === 'en_practicas';

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
          {isOperador ? (
            operatorMenu.map(renderItem)
          ) : (
            visibleCategories.map(cat => (
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
