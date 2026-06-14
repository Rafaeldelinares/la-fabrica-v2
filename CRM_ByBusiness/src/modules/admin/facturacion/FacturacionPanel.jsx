import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import ClientesPanel from './ClientesPanel';
import RenovacionesPanel from './RenovacionesPanel';
import FacturasPanel from './FacturasPanel';
import ProformasPanel from './ProformasPanel';
import ClienteDrawer from '../cartera/ClienteDrawer';
import { Users, RefreshCw, FileText, ClipboardList } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { n8nGet } from '../../../shared/hooks/useN8n';

const TABS = [
  { id: 'clientes',     label: 'CLIENTES',     icon: Users },
  { id: 'proformas',    label: 'PROFORMAS',    icon: ClipboardList },
  { id: 'facturas',     label: 'FACTURAS',     icon: FileText },
  { id: 'renovaciones', label: 'RENOVACIONES', icon: RefreshCw },
];

/** Panel de facturación con cuatro pestañas: Clientes, Proformas, Facturas y Renovaciones. */
const FacturacionPanel = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('clientes');
  const [clienteDrawer, setClienteDrawer] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const contenidoRef = useRef(null);
  const [alturaContenido, setAlturaContenido] = useState(500);

  useEffect(() => {
    if (!contenidoRef.current) return;
    const obs = new ResizeObserver(entries => {
      setAlturaContenido(Math.floor(entries[0].contentRect.height));
    });
    obs.observe(contenidoRef.current);
    return () => obs.disconnect();
  }, []);

  /** Fetch puntual del cliente por id y abre el ClienteDrawer. */
  const abrirCliente = useCallback((clienteId) => {
    n8nGet('crm-cartera-get', { cliente_id: clienteId })
      .then(data => { if (data.ok && data.clientes?.length) setClienteDrawer(data.clientes[0]); })
      .catch(err => console.error('[FacturacionPanel] Error abriendo cliente:', err));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950 font-sans">

      <div className="shrink-0 mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black text-white uppercase tracking-widest">FACTURACIÓN</h2>
        <div className="flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-colors ${
                  tab === t.id
                    ? 'bg-[#D00000]/10 text-[#D00000] border border-[#D00000]/30'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <Icon size={11} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={contenidoRef} className="flex-1 min-h-0 overflow-hidden">
        {tab === 'clientes'     && <ClientesPanel     alturaDisponible={alturaContenido} onAbrirCliente={abrirCliente} reloadKey={reloadKey} />}
        {tab === 'proformas'    && <ProformasPanel    alturaDisponible={alturaContenido} onAbrirCliente={abrirCliente} reloadKey={reloadKey} />}
        {tab === 'facturas'     && <FacturasPanel     alturaDisponible={alturaContenido} onAbrirCliente={abrirCliente} reloadKey={reloadKey} />}
        {tab === 'renovaciones' && <RenovacionesPanel alturaDisponible={alturaContenido} onAbrirCliente={abrirCliente} reloadKey={reloadKey} />}
      </div>

      {clienteDrawer && (
        <div className="fixed top-16 bottom-10 inset-x-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
             onClick={() => setClienteDrawer(null)}>
          <div className="w-[90vw] max-w-[1080px] h-full overflow-hidden rounded-sm border border-slate-700 shadow-2xl"
               onClick={e => e.stopPropagation()}>
            <ClienteDrawer
              cliente={clienteDrawer}
              gestorId={user?.id}
              onClose={() => setClienteDrawer(null)}
              onGestorChanged={() => { setClienteDrawer(null); setReloadKey(k => k + 1); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/** Prop compartida entre los tres paneles hijos para abrir la ficha de un cliente. */
// eslint-disable-next-line react-refresh/only-export-components
export const _abrirClientePropType = PropTypes.func.isRequired;

export default FacturacionPanel;
