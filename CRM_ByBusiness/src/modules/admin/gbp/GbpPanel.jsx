import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { MapPin, LayoutDashboard, List, X, Plus } from 'lucide-react';
import GbpDashboardPanel from './GbpDashboardPanel';
import GbpFichasPanel from './GbpFichasPanel';

const TABS = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'FICHAS',    label: 'Fichas',    icon: List },
];

/**
 * Modal informativo cuando se selecciona una ficha GBP — muestra datos básicos.
 * La gestión avanzada se realiza desde el ClienteDrawer (tab Google Business).
 */
const FichaInfoModal = ({ ficha, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="bg-slate-900 border border-slate-700 rounded-sm w-full max-w-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
          <MapPin size={13} className="text-[#D00000]" /> {ficha.nombre || ficha.gmaps_nombre || 'Ficha GBP'}
        </span>
        <button onClick={onClose}><X size={13} className="text-slate-500 hover:text-white" /></button>
      </div>
      <div className="px-5 py-4 flex flex-col gap-2">
        {ficha.categoria_principal && (
          <p className="text-[10px] text-slate-400 font-mono">{ficha.categoria_principal}</p>
        )}
        {ficha.rating_actual && (
          <p className="text-[10px] text-amber-400 font-mono font-bold">
            {Number(ficha.rating_actual).toFixed(1)} ★
          </p>
        )}
        <p className="text-[10px] text-slate-500 font-mono">
          Para gestionar esta ficha, accede al cliente en Cartera y abre la pestaña Google Business.
        </p>
      </div>
      <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
        <button onClick={onClose}
          className="text-[10px] font-mono px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-sm transition-colors">
          Cerrar
        </button>
      </div>
    </div>
  </div>
);

FichaInfoModal.propTypes = {
  ficha:   PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * Modal para dar de alta una nueva ficha GBP.
 * Redirige al usuario al flujo de alta desde el módulo Cartera.
 */
const AltaFichaInfo = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="bg-slate-900 border border-slate-700 rounded-sm w-full max-w-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
          <Plus size={13} className="text-[#D00000]" /> Alta de ficha GBP
        </span>
        <button onClick={onClose}><X size={13} className="text-slate-500 hover:text-white" /></button>
      </div>
      <div className="px-5 py-4">
        <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
          Para vincular una ficha de Google Business a un cliente, accede al cliente en{' '}
          <span className="text-white">Cartera</span>, abre el drawer y ve a la pestaña{' '}
          <span className="text-white">Google Business</span>.
        </p>
        <p className="text-[10px] text-slate-500 font-mono mt-2">
          Desde allí podrás añadir o buscar fichas GBP asociadas al cliente.
        </p>
      </div>
      <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
        <button onClick={onClose}
          className="text-[10px] font-mono px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-sm transition-colors">
          Entendido
        </button>
      </div>
    </div>
  </div>
);

AltaFichaInfo.propTypes = {
  onClose: PropTypes.func.isRequired,
};

/** Panel principal de Google Business Profile — tabs Dashboard y Fichas. */
const GbpPanel = () => {
  const [tab, setTab] = useState('DASHBOARD');
  const [fichaModal, setFichaModal]   = useState(null);
  const [altaModal, setAltaModal]     = useState(false);

  const handleSelectFicha = (ficha) => {
    if (ficha === 'alta') {
      setAltaModal(true);
      return;
    }
    setFichaModal(ficha);
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">

      {/* Modales */}
      {fichaModal && <FichaInfoModal ficha={fichaModal} onClose={() => setFichaModal(null)} />}
      {altaModal  && <AltaFichaInfo onClose={() => setAltaModal(false)} />}

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

GbpPanel.propTypes = {};

export default GbpPanel;
