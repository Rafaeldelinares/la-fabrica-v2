/**
 * ProformaEstadoBadge — displays proforma estado with color coding.
 *
 * Maps:
 *   borrador         → grey
 *   rellenada       → amber
 *   enviada         → emerald
 *   pendiente_cliente → blue
 *   aceptada        → emerald
 *   rechazada       → red
 *
 * @param {string} estado - proforma estado value
 */
import React from 'react';
import PropTypes from 'prop-types';

const CONFIG = {
  borrador:          { bg: 'bg-slate-800', text: 'text-slate-300', label: 'Borrador' },
  rellenada:         { bg: 'bg-amber-900/30', text: 'text-amber-400', label: 'Rellenada' },
  enviada:           { bg: 'bg-emerald-900/30', text: 'text-emerald-400', label: 'Enviada' },
  pendiente_cliente: { bg: 'bg-blue-900/30', text: 'text-blue-400', label: 'Pendiente cliente' },
  aceptada:          { bg: 'bg-emerald-900/30', text: 'text-emerald-400', label: 'Aceptada' },
  rechazada:         { bg: 'bg-red-900/30', text: 'text-red-400', label: 'Rechazada' },
  verificada:        { bg: 'bg-blue-900/30', text: 'text-blue-400', label: 'Verificada' },
  aprobada:          { bg: 'bg-emerald-900/30', text: 'text-emerald-400', label: 'Aprobada' },
};

const FALLBACK = { bg: 'bg-slate-800', text: 'text-slate-400', label: 'Desconocido' };

const ProformaEstadoBadge = ({ estado }) => {
  const cfg = CONFIG[estado] ?? FALLBACK;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${cfg.bg} ${cfg.text} border-transparent`}
    >
      {cfg.label}
    </span>
  );
};

ProformaEstadoBadge.propTypes = {
  estado: PropTypes.string.isRequired,
};

export default ProformaEstadoBadge;
