import React, { useState } from 'react';
import { MapPin, LayoutDashboard, List } from 'lucide-react';
import GbpDashboardPanel from './GbpDashboardPanel';
import GbpFichasPanel from './GbpFichasPanel';

const TABS = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'FICHAS',    label: 'Fichas',    icon: List },
];

const GbpPanel = () => {
  const [tab, setTab] = useState('DASHBOARD');
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);

  const handleSelectFicha = (ficha) => {
    if (ficha === 'alta') {
      // TODO Sprint 2: abrir GbpAltaModal
      alert('Alta de ficha — disponible en Sprint 2');
      return;
    }
    setFichaSeleccionada(ficha);
    // TODO Sprint 2: abrir GbpFichaDetailModal
    alert(`Detalle de ${ficha.nombre} — disponible en Sprint 2`);
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-[#D00000]" />
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Google Business</h2>
          <span className="text-[9px] font-mono text-slate-600 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-sm uppercase tracking-widest">
            Fase 9
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 py-2 border-b-2 transition-colors ${
              tab === id
                ? 'border-[#D00000] text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {tab === 'DASHBOARD' && <GbpDashboardPanel />}
        {tab === 'FICHAS'    && <GbpFichasPanel onSelectFicha={handleSelectFicha} />}
      </div>
    </div>
  );
};

export default GbpPanel;
