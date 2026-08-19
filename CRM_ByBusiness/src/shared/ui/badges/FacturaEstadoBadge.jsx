/**
 * FacturaEstadoBadge — displays factura estado with color coding.
 *
 * Maps:
 *   emitida        → grey
 *   pendiente_envio → amber
 *   enviada       → emerald
 *   cobrada       → green
 *   vencida       → red
 *   anulada       → red/muted
 *
 * Note: 'generada' is a transient state inside the workflow — not rendered.
 *
 * @param {string} estado - factura estado value
 */
import React from 'react';
import PropTypes from 'prop-types';

const CONFIG = {
  emitida:         { bg: 'bg-slate-800', text: 'text-slate-300', label: 'Emitida' },
  pendiente_envio: { bg: 'bg-amber-900/30', text: 'text-amber-400', label: 'Pendiente envío' },
  enviada:        { bg: 'bg-emerald-900/30', text: 'text-emerald-400', label: 'Enviada' },
  cobrada:        { bg: 'bg-green-900/30', text: 'text-green-400', label: 'Cobrada' },
  vencida:        { bg: 'bg-red-900/30', text: 'text-red-400', label: 'Vencida' },
  anulada:        { bg: 'bg-slate-800', text: 'text-slate-500', label: 'Anulada' },
};

const FALLBACK = { bg: 'bg-slate-800', text: 'text-slate-400', label: 'Desconocido' };

const FacturaEstadoBadge = ({ estado }) => {
  const cfg = CONFIG[estado] ?? FALLBACK;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${cfg.bg} ${cfg.text} border-transparent`}
    >
      {cfg.label}
    </span>
  );
};

FacturaEstadoBadge.propTypes = {
  estado: PropTypes.string.isRequired,
};

export default FacturaEstadoBadge;
