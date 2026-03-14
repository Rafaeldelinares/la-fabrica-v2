import React, { useState } from 'react';
import ClientesPanel from './ClientesPanel';
import RenovacionesPanel from './RenovacionesPanel';
import FacturasPanel from './FacturasPanel';
import { Users, RefreshCw, FileText } from 'lucide-react';

const TABS = [
  { id: 'clientes',     label: 'CLIENTES',     icon: Users },
  { id: 'facturas',     label: 'FACTURAS',     icon: FileText },
  { id: 'renovaciones', label: 'RENOVACIONES', icon: RefreshCw },
];

const FacturacionPanel = () => {
  const [tab, setTab] = useState('clientes');

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">

      <div className="flex items-center justify-between">
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

      {tab === 'clientes'     && <ClientesPanel />}
      {tab === 'facturas'     && <FacturasPanel />}
      {tab === 'renovaciones' && <RenovacionesPanel />}
    </div>
  );
};

export default FacturacionPanel;
