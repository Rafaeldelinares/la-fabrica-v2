import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Send } from 'lucide-react';
import { formatISO } from 'date-fns';
import DatePickerField from '../../../shared/ui/DatePickerField';
import { n8nPost } from '../../../shared/hooks/useN8n';

/**
 * Mapa de tipos de interacción disponibles en el CRM.
 * @type {Array<{value: string, label: string}>}
 */
const TIPOS = [
  { value: 'llamada',  label: 'Llamada' },
  { value: 'email',    label: 'Email' },
  { value: 'reunion',  label: 'Reunión' },
  { value: 'nota',     label: 'Nota interna' },
  { value: 'acuerdo',  label: 'Acuerdo' },
];

/**
 * Modal para registrar una nueva interacción o editar una existente.
 * En modo edición, recibe `interaccion` con los datos a precargar.
 *
 * @param {object}   props
 * @param {object}   props.cliente       - Objeto cliente con al menos {id, nombre_comercial}
 * @param {number}   [props.gestorId]    - ID del gestor que registra la interacción
 * @param {object}   [props.interaccion] - Si se pasa, el modal opera en modo edición
 * @param {Function} props.onClose       - Callback para cerrar el modal
 * @param {Function} props.onSaved       - Callback invocado tras guardar
 */
const RegistrarInteraccionModal = ({ cliente, gestorId, interaccion, onClose, onSaved }) => {
  const esEdicion = Boolean(interaccion);

  const [tipo, setTipo]                   = useState(interaccion?.tipo || 'llamada');
  const [resumen, setResumen]             = useState(interaccion?.resumen || '');
  const [acuerdo, setAcuerdo]             = useState(interaccion?.acuerdo_alcanzado || '');
  const [proximaAccion, setProximaAccion] = useState(interaccion?.proxima_accion || '');
  const [fechaHora, setFechaHora]         = useState(null);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumen.trim()) { setError('El resumen es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      const path = esEdicion ? 'crm-interaccion-editar' : 'crm-registrar-interaccion';

      const body = esEdicion
        ? {
            interaccion_id:    interaccion.evento_id,
            tipo,
            resumen:           resumen.trim(),
            acuerdo_alcanzado: acuerdo.trim() || null,
            proxima_accion:    proximaAccion.trim() || null,
          }
        : {
            cliente_id:        cliente.id,
            gestor_id:         gestorId,
            tipo,
            resumen:           resumen.trim(),
            acuerdo_alcanzado: acuerdo.trim() || null,
            proxima_accion:    proximaAccion.trim() || null,
            fecha_hora:        fechaHora ? formatISO(fechaHora) : null,
          };

      const d = await n8nPost(path, body);
      if (d.ok) { onSaved(d.interaccion); }
      else { setError(d.message || 'Error al guardar'); }
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith('HTTP') ? 'Error de conexión al guardar la interacción' : 'Error al guardar la interacción');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              {esEdicion ? 'Editar interacción' : 'Registrar interacción'}
            </p>
            <p className="text-sm font-bold text-white uppercase tracking-wide mt-0.5">{cliente.nombre_comercial}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Tipo */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wide border transition-colors ${
                    tipo === t.value
                      ? 'bg-[#D00000]/20 border-[#D00000] text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">
              Resumen <span className="text-[#D00000]">*</span>
            </label>
            <textarea
              value={resumen}
              onChange={e => setResumen(e.target.value)}
              rows={3}
              placeholder="¿Qué ocurrió en esta interacción?"
              className="w-full bg-slate-950 border border-slate-700 rounded-sm text-sm text-slate-200 px-3 py-2.5 outline-none focus:border-[#D00000] resize-none placeholder:text-slate-600 font-mono"
            />
          </div>

          {/* Acuerdo */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">Acuerdo alcanzado</label>
            <input
              type="text"
              value={acuerdo}
              onChange={e => setAcuerdo(e.target.value)}
              placeholder="Opcional — p.ej. Renovación confirmada para Mayo"
              className="w-full bg-slate-950 border border-slate-700 rounded-sm text-sm text-slate-200 px-3 py-2.5 outline-none focus:border-[#D00000] placeholder:text-slate-600 font-mono"
            />
          </div>

          {/* Próxima acción */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">Próxima acción</label>
            <input
              type="text"
              value={proximaAccion}
              onChange={e => setProximaAccion(e.target.value)}
              placeholder="Opcional — p.ej. Llamar el 20 Mar para confirmar"
              className="w-full bg-slate-950 border border-slate-700 rounded-sm text-sm text-slate-200 px-3 py-2.5 outline-none focus:border-[#D00000] placeholder:text-slate-600 font-mono"
            />
          </div>

          {/* Fecha y hora — solo en modo creación */}
          {!esEdicion && (
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">
                Fecha y hora <span className="text-slate-600 normal-case tracking-normal">(opcional — por defecto ahora)</span>
              </label>
              <DatePickerField
                selected={fechaHora}
                onChange={setFechaHora}
                showTimeSelect
                placeholderText="DD/MM/AAAA HH:MM — ahora si vacío"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase text-slate-400 hover:text-white border border-slate-700 rounded-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#D00000] hover:bg-[#B00000] text-white text-xs font-mono uppercase tracking-widest rounded-sm transition-colors disabled:opacity-50">
              <Send size={14} />
              {saving ? 'Guardando…' : esEdicion ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

RegistrarInteraccionModal.propTypes = {
  cliente:     PropTypes.object.isRequired,
  gestorId:    PropTypes.number,
  interaccion: PropTypes.object,
  onClose:     PropTypes.func.isRequired,
  onSaved:     PropTypes.func.isRequired,
};

export default RegistrarInteraccionModal;
