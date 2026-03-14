import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Activity, 
  UserPlus, 
  History, 
  TrendingUp,
  PhoneForwarded,
  ListTodo,
  Briefcase,
  BadgeCheck,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NavButton = ({ label, icon: Icon, active, onClick, color = 'text-slate-500' }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${
      active 
        ? 'bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 shadow-lg' 
        : 'hover:bg-slate-900/50 border border-transparent hover:border-slate-800'
    }`}
  >
    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D00000]"></div>}
    <Icon className={`w-5 h-5 ${active ? 'text-[#D00000]' : `${color} group-hover:text-slate-300`}`} />
    <span className={`font-bold tracking-wider text-[10px] text-left ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
      {label}
    </span>
    {active && <div className="absolute inset-0 bg-[#D00000] opacity-5 pointer-events-none"></div>}
  </button>
);

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const adminItems = [
    { id: 'DASHBOARD_EXE', label: 'DASHBOARD EJECUTIVO', icon: LayoutDashboard },
    { id: 'AGENDA_GLOB', label: 'AGENDA GLOBAL', icon: Calendar },
    { id: 'MONITOR', label: 'MONITORIZACIÓN REAL-TIME', icon: Activity },
    { id: 'LEADS_GESTON', label: 'GESTIÓN DE LEADS', icon: UserPlus },
    { id: 'AUDITORIA', label: 'AUDITORÍA E HISTORIAL', icon: History },
    { id: 'VENTAS', label: 'RELACIÓN DE VENTAS', icon: TrendingUp },
    { id: 'WHATSAPP_PANEL', label: 'WHATSAPP / CHAT', icon: MessageSquare },
  ];

  const operatorItems = [
    { id: 'NEXT_CALL', label: 'LLAMADA SIGUIENTE', icon: PhoneForwarded },
    { id: 'MY_QUEUE', label: 'MI COLA DIARIA', icon: ListTodo },
    { id: 'MY_ACTIONS', label: 'MIS GESTIONES', icon: Briefcase },
    { id: 'MY_SALES', label: 'MIS VENTAS', icon: BadgeCheck },
    { id: 'WHATSAPP_PANEL', label: 'WHATSAPP / CHAT', icon: MessageSquare },
  ];

  const currentItems = isAdmin ? adminItems : operatorItems;

  return (
    <div className="w-64 flex flex-col gap-1 bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-3 shadow-2xl relative overflow-hidden h-full">
         {/* Background Grid for Module */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50"></div>
        
         <div className="relative z-10 flex flex-col gap-2">
            <div className="px-4 py-2 border-b border-slate-800/50 mb-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  {isAdmin ? 'TORRE DE CONTROL' : 'MODO TÚNEL'}
                </span>
            </div>
            
            {currentItems.map((item) => (
              <NavButton 
                key={item.id}
                label={item.label} 
                icon={item.icon} 
                active={activeTab === item.id} 
                onClick={() => setActiveTab(item.id)}
              />
            ))}
         </div>
    </div>
  );
};

export default Sidebar;
