import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw } from 'lucide-react';
import { n8nGet } from '../../../shared/hooks/useN8n';

/**
 * Formatea un string ISO de slot a "Lun 20/03 · 10:00".
 * @param {string} isoString
 * @returns {string}
 */
const formatearSlot = (isoString) => {
  const fecha = parseISO(isoString);
  const diaSemana = format(fecha, 'EEE', { locale: es });
  const diaMes    = format(fecha, 'dd/MM');
  const hora      = format(fecha, 'HH:mm');
  const diaCapital = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  return `${diaCapital} ${diaMes} · ${hora}`;
};

/**
 * Buscador de huecos disponibles en la agenda de un usuario.
 * Consulta el endpoint crm-buscar-hueco y muestra la lista de slots
 * disponibles para que el usuario seleccione uno.
 *
 * @param {{ usuarioId: number, duracionMin: number, fechaDesde: string, onSlotSelected: Function, onCancelar: Function }} props
 */
const SlotPicker = ({ usuarioId, duracionMin, fechaDesde, onSlotSelected, onCancelar }) => {
  const [slots, setSlots]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState(false);
  const [sinHuecos, setSinHuecos] = useState(false);

  const buscarHuecos = () => {
    if (!usuarioId) return;
    setCargando(true);
    setError(false);
    setSinHuecos(false);

    const params = new URLSearchParams({
      usuario_id:   usuarioId,
      duracion_min: duracionMin,
      fecha_desde:  fechaDesde,
      n_slots:      8,
    });

    n8nGet(`crm-buscar-hueco?${params.toString()}`)
      .then(datos => {
        if (!datos.ok) { setError(true); return; }
        if (datos.slots.length === 0) { setSinHuecos(true); setSlots([]); return; }
        setSlots(datos.slots);
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  };

  useEffect(() => { buscarHuecos(); }, [usuarioId, duracionMin, fechaDesde]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  if (cargando) {
    return (
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3, 4].map(indice => (
          <div key={indice} className="h-8 bg-slate-800/60 rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-red-400 font-mono bg-red-900/20 border border-red-900/30 rounded-sm px-3 py-2">
          Error al buscar huecos
        </p>
        <button
          onClick={buscarHuecos}
          className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-sm px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={10} /> Reintentar
        </button>
      </div>
    );
  }

  if (sinHuecos) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-slate-500 font-mono italic">
          Sin huecos en los próximos 14 días
        </p>
        <button
          onClick={onCancelar}
          className="text-[9px] text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-sm px-3 py-1.5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {slots.map(isoString => (
        <button
          key={isoString}
          onClick={() => onSlotSelected(isoString)}
          className="w-full text-left px-3 py-2 text-xs text-slate-200 font-mono bg-slate-800 border border-slate-700 hover:border-blue-500 hover:text-white rounded-sm transition-colors"
        >
          {formatearSlot(isoString)}
        </button>
      ))}
      <button
        onClick={onCancelar}
        className="mt-1 text-[9px] text-slate-500 hover:text-slate-300 transition-colors text-center"
      >
        Cancelar búsqueda
      </button>
    </div>
  );
};

SlotPicker.propTypes = {
  /** ID del usuario cuya agenda se consulta. */
  usuarioId:      PropTypes.number.isRequired,
  /** Duración de la cita en minutos (15, 30 ó 45). */
  duracionMin:    PropTypes.number.isRequired,
  /** Fecha de inicio de búsqueda en formato YYYY-MM-DD. */
  fechaDesde:     PropTypes.string.isRequired,
  /** Callback que recibe el ISO string del slot elegido. */
  onSlotSelected: PropTypes.func.isRequired,
  /** Callback para cancelar la búsqueda y volver al DatePicker. */
  onCancelar:     PropTypes.func.isRequired,
};

export default SlotPicker;
