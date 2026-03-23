import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ProformasSection from './facturacion/ProformasSection';
import FacturasSection  from './facturacion/FacturasSection';

const SUB_TABS = [
  { id: 'proformas', label: 'Proformas' },
  { id: 'facturas',  label: 'Facturas'  },
];

/**
 * TabFacturacion — Tab principal de facturación con sub-tabs Proformas y Facturas.
 * Los contratos digitales se gestionan inline desde ProformasSection.
 * @param {{ cliente: object, n8nUrl: string, gestorId: string|number }} props
 */
const TabFacturacion = ({ cliente, n8nUrl, gestorId }) => {
  const [active, setActive] = useState('proformas');

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-800 shrink-0">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${
              active === t.id
                ? 'text-white border-b-2 border-[#D00000] -mb-px'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {active === 'proformas' && (
          <ProformasSection cliente={cliente} n8nUrl={n8nUrl} operadorId={gestorId} />
        )}
        {active === 'facturas' && (
          <FacturasSection cliente={cliente} n8nUrl={n8nUrl} />
        )}
      </div>
    </div>
  );
};

TabFacturacion.propTypes = {
  cliente:  PropTypes.object.isRequired,
  n8nUrl:   PropTypes.string.isRequired,
  gestorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default TabFacturacion;
