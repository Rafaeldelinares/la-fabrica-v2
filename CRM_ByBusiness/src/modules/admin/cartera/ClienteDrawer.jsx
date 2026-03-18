import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Plus } from 'lucide-react';
import RegistrarInteraccionModal from './RegistrarInteraccionModal';
import TabFicha     from './tabs/TabFicha';
import TabContratos from './tabs/TabContratos';
import TabHistorial from './tabs/TabHistorial';
import TabGbp       from './tabs/TabGbp';
import { fmtDias } from '../../../utils/dates';

const SEMAFORO = {
  verde: 'bg-emerald-500',
  ambar: 'bg-amber-400',
  rojo:  'bg-red-500',
};

const TABS = [
  { id: 'ficha',     label: 'Ficha' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'historial', label: 'Historial' },
  { id: 'gbp',       label: 'Google Business' },
];

const KPI_CONFIG = [
  { label: 'Último contacto', key: 'dias_sin_contacto', format: (c) => fmtDias(c.dias_sin_contacto) },
  { label: 'Contratos',       key: 'num_contratos',     format: (c) => c.num_contratos || '0' },
  { label: 'MRR',             key: 'mrr',               format: (c) => c.mrr > 0 ? `${Number(c.mrr).toFixed(0)}€` : '—' },
];

/**
 * ClienteDrawer — Contenedor del drawer de ficha completa de un cliente de cartera.
 * Gestiona qué tab está activo, carga el timeline y renderiza header + tabs.
 * @param {{ cliente: object, gestorId: string|number, onClose: Function, onGestorChanged: Function, onClienteBaja: Function }} props
 */
const ClienteDrawer = ({ cliente, gestorId, onClose, onGestorChanged, onClienteBaja }) => {
  const [activeTab,        setActiveTab]        = useState('ficha');
  const [timeline,         setTimeline]         = useState(null);
  const [showModal,        setShowModal]        = useState(false);
  const [interaccionEditar, setInteraccionEditar] = useState(null);
  const [errorTimeline,    setErrorTimeline]    = useState(null);

  const N8N = import.meta.env.VITE_N8N_URL;

  const fetchTimeline = () => {
    setErrorTimeline(null);
    fetch(`${N8N}/crm-interacciones-cliente?cliente_id=${cliente.id}`)
      .then(res => res.json())
      .then(data => { if (data.ok) setTimeline(data.timeline); else setTimeline([]); })
      .catch(() => { setTimeline([]); setErrorTimeline('Error al cargar historial'); });
  };

  useEffect(() => {
    fetchTimeline();
  }, [cliente.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaved = () => {
    setShowModal(false);
    setInteraccionEditar(null);
    fetchTimeline();
    setActiveTab('historial');
  };

  const handleEditInteraccion = (ev) => {
    setInteraccionEditar(ev);
    setShowModal(true);
  };

  const handleDeleteInteraccion = (interaccionId) => {
    fetch(`${N8N}/crm-interaccion-borrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interaccion_id: interaccionId }),
    })
      .then(res => res.json())
      .then(d => { if (d.ok) fetchTimeline(); })
      .catch(() => {});
  };

  return (
    <>
      <div className="flex flex-col h-full border-l border-slate-800 bg-slate-950">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-sm mt-1 shrink-0 ${SEMAFORO[cliente.semaforo] || 'bg-slate-600'}`} />
            <div>
              <p className="text-sm font-black text-white uppercase tracking-wide leading-tight">
                {cliente.nombre_comercial}
              </p>
              {cliente.localidad && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{cliente.localidad}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors shrink-0 ml-2">
            <X size={16} />
          </button>
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-3 border-b border-slate-800 shrink-0">
          {KPI_CONFIG.map((kpi, idx) => (
            <div key={kpi.key} className={`px-4 py-3 text-center ${idx < 2 ? 'border-r border-slate-800' : ''}`}>
              <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">{kpi.label}</p>
              <p className="text-sm font-bold text-slate-300 mt-0.5 font-mono">{kpi.format(cliente)}</p>
            </div>
          ))}
        </div>

        {/* Botón registrar interacción */}
        <div className="px-5 py-3 border-b border-slate-800 shrink-0">
          <button
            onClick={() => { setInteraccionEditar(null); setShowModal(true); }}
            className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-[#D00000]/10 hover:bg-[#D00000]/20 border border-[#D00000]/30 hover:border-[#D00000]/60 text-[#D00000] text-xs font-mono uppercase tracking-widest rounded-sm transition-colors"
          >
            <Plus size={13} /> Registrar interacción
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-[#D00000] -mb-px'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido del tab activo */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'ficha'     && (
            <TabFicha
              cliente={cliente}
              n8nUrl={N8N}
              onGestorChanged={onGestorChanged}
              onClienteBaja={onClienteBaja}
            />
          )}
          {activeTab === 'contratos' && <TabContratos cliente={cliente} n8nUrl={N8N} />}
          {activeTab === 'historial' && (
            <>
              {errorTimeline && (
                <p className="text-[10px] text-red-400 font-mono px-5 pt-4">{errorTimeline}</p>
              )}
              <TabHistorial
                timeline={timeline}
                onDeleteInteraccion={handleDeleteInteraccion}
                onEditInteraccion={handleEditInteraccion}
              />
            </>
          )}
          {activeTab === 'gbp'       && <TabGbp cliente={cliente} n8nUrl={N8N} />}
        </div>
      </div>

      {showModal && (
        <RegistrarInteraccionModal
          cliente={cliente}
          gestorId={gestorId}
          interaccion={interaccionEditar}
          onClose={() => { setShowModal(false); setInteraccionEditar(null); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

ClienteDrawer.propTypes = {
  cliente:         PropTypes.object.isRequired,
  gestorId:        PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClose:         PropTypes.func.isRequired,
  onGestorChanged: PropTypes.func,
  onClienteBaja:   PropTypes.func,
};

export default ClienteDrawer;
