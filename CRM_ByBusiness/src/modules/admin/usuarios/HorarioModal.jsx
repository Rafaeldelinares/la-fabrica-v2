import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Plus, Trash2, Clock, Save } from 'lucide-react';

const N8N = import.meta.env.VITE_N8N_URL;

const DIAS_SEMANA = [
  { valor: 0, etiqueta: 'Lunes' },
  { valor: 1, etiqueta: 'Martes' },
  { valor: 2, etiqueta: 'Miércoles' },
  { valor: 3, etiqueta: 'Jueves' },
  { valor: 4, etiqueta: 'Viernes' },
  { valor: 5, etiqueta: 'Sábado' },
  { valor: 6, etiqueta: 'Domingo' },
];

/**
 * Valida que la cadena tenga formato HH:MM (00:00 a 23:59).
 * @param {string} valor
 * @returns {boolean}
 */
const esHoraValida = (valor) => /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);

/**
 * Convierte "HH:MM:SS" (formato PostgreSQL TIME) a "HH:MM".
 * @param {string} tiempo
 * @returns {string}
 */
const normalizarHora = (tiempo) => {
  if (!tiempo) return '';
  return tiempo.slice(0, 5);
};

/**
 * Modal para gestionar los bloques horarios de un usuario.
 * Muestra los horarios actuales agrupados por día, permite agregar
 * y eliminar bloques, y guarda vía POST crm-horarios-guardar.
 *
 * @param {{ usuario: Object, onClose: Function, onGuardado: Function }} props
 */
const HorarioModal = ({ usuario, onClose, onGuardado }) => {
  /** @type {[Array<{dia_semana: number, hora_inicio: string, hora_fin: string}>, Function]} */
  const [bloques, setBloques]       = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [guardando, setGuardando]   = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(null);

  useEffect(() => {
    setCargando(true);
    setErrorCarga(false);
    fetch(`${N8N}/crm-horarios?usuario_id=${usuario.id}`)
      .then(respuesta => respuesta.json())
      .then(datos => {
        if (datos.ok) {
          setBloques(
            datos.horarios.map(bloque => ({
              dia_semana:  bloque.dia_semana,
              hora_inicio: normalizarHora(bloque.hora_inicio),
              hora_fin:    normalizarHora(bloque.hora_fin),
            }))
          );
        } else {
          setErrorCarga(true);
        }
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, [usuario.id]);

  /**
   * Agrega un bloque vacío para el día indicado.
   * @param {number} diaSemana
   */
  const agregarBloque = (diaSemana) => {
    setBloques(anterior => [
      ...anterior,
      { dia_semana: diaSemana, hora_inicio: '09:00', hora_fin: '14:00' },
    ]);
  };

  /**
   * Elimina el bloque en la posición global indicada.
   * @param {number} indiceGlobal
   */
  const eliminarBloque = (indiceGlobal) => {
    setBloques(anterior => anterior.filter((_, indice) => indice !== indiceGlobal));
  };

  /**
   * Actualiza un campo de un bloque por su índice global.
   * @param {number} indiceGlobal
   * @param {'hora_inicio'|'hora_fin'} campo
   * @param {string} valor
   */
  const actualizarBloque = (indiceGlobal, campo, valor) => {
    setBloques(anterior =>
      anterior.map((bloque, indice) =>
        indice === indiceGlobal ? { ...bloque, [campo]: valor } : bloque
      )
    );
  };

  /**
   * Valida todos los bloques y envía al endpoint crm-horarios-guardar.
   */
  const guardar = async () => {
    setErrorGuardado(null);

    const bloquesInvalidos = bloques.filter(
      bloque => !esHoraValida(bloque.hora_inicio) || !esHoraValida(bloque.hora_fin)
    );
    if (bloquesInvalidos.length > 0) {
      setErrorGuardado('Revisa el formato de hora (HH:MM) en todos los bloques.');
      return;
    }

    const bloquesConRangoInvalido = bloques.filter(
      bloque => bloque.hora_fin <= bloque.hora_inicio
    );
    if (bloquesConRangoInvalido.length > 0) {
      setErrorGuardado('La hora de fin debe ser posterior a la hora de inicio en todos los bloques.');
      return;
    }

    setGuardando(true);
    fetch(`${N8N}/crm-horarios-guardar`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ usuario_id: usuario.id, bloques }),
    })
      .then(respuesta => respuesta.json())
      .then(datos => {
        if (datos.ok) {
          onGuardado();
          onClose();
        } else {
          setErrorGuardado('Error al guardar los horarios. Inténtalo de nuevo.');
        }
      })
      .catch(() => setErrorGuardado('Error de conexión al guardar los horarios.'))
      .finally(() => setGuardando(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-sm w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#D00000]" />
            <span className="text-xs font-black uppercase tracking-widest text-white">
              Horario — {usuario.nombre}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Cuerpo con scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {errorGuardado && (
            <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
              {errorGuardado}
            </div>
          )}

          {cargando && (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(indice => (
                <div key={indice} className="h-10 bg-slate-800/50 rounded-sm animate-pulse" />
              ))}
            </div>
          )}

          {!cargando && errorCarga && (
            <p className="text-[10px] text-red-400 font-mono">
              Error al cargar los horarios del usuario.
            </p>
          )}

          {!cargando && !errorCarga && DIAS_SEMANA.map(dia => {
            const bloquesDelDia = bloques
              .map((bloque, indiceGlobal) => ({ bloque, indiceGlobal }))
              .filter(({ bloque }) => bloque.dia_semana === dia.valor);

            return (
              <div key={dia.valor}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {dia.etiqueta}
                  </span>
                  <button
                    onClick={() => agregarBloque(dia.valor)}
                    className="flex items-center gap-0.5 text-[9px] text-slate-500 hover:text-[#D00000] transition-colors"
                    title={`Añadir bloque el ${dia.etiqueta}`}
                  >
                    <Plus size={10} /> Añadir
                  </button>
                </div>

                {bloquesDelDia.length === 0 && (
                  <p className="text-[10px] text-slate-700 italic pl-1">Sin bloques</p>
                )}

                <div className="flex flex-col gap-1.5">
                  {bloquesDelDia.map(({ bloque, indiceGlobal }) => (
                    <div key={indiceGlobal} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bloque.hora_inicio}
                        onChange={evento => actualizarBloque(indiceGlobal, 'hora_inicio', evento.target.value)}
                        placeholder="HH:MM"
                        maxLength={5}
                        className={`w-20 bg-slate-800 border rounded-sm px-2 py-1 text-xs text-slate-200 font-mono outline-none focus:border-blue-500 text-center ${
                          esHoraValida(bloque.hora_inicio) ? 'border-slate-700' : 'border-red-700'
                        }`}
                      />
                      <span className="text-slate-600 text-xs">–</span>
                      <input
                        type="text"
                        value={bloque.hora_fin}
                        onChange={evento => actualizarBloque(indiceGlobal, 'hora_fin', evento.target.value)}
                        placeholder="HH:MM"
                        maxLength={5}
                        className={`w-20 bg-slate-800 border rounded-sm px-2 py-1 text-xs text-slate-200 font-mono outline-none focus:border-blue-500 text-center ${
                          esHoraValida(bloque.hora_fin) ? 'border-slate-700' : 'border-red-700'
                        }`}
                      />
                      {bloque.hora_fin <= bloque.hora_inicio && esHoraValida(bloque.hora_inicio) && esHoraValida(bloque.hora_fin) && (
                        <span className="text-[9px] text-red-400 font-mono">fin ≤ inicio</span>
                      )}
                      <button
                        onClick={() => eliminarBloque(indiceGlobal)}
                        className="ml-auto p-1 text-slate-600 hover:text-red-400 transition-colors"
                        title="Eliminar bloque"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-sm border border-slate-700 hover:border-slate-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || cargando}
            className="flex items-center gap-1.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 px-4 py-2 rounded-sm transition-colors uppercase tracking-wider"
          >
            <Save size={12} />
            {guardando ? 'Guardando...' : 'Guardar horario'}
          </button>
        </div>
      </div>
    </div>
  );
};

HorarioModal.propTypes = {
  /** Usuario al que pertenece el horario: necesita id y nombre. */
  usuario:    PropTypes.shape({
    id:     PropTypes.number.isRequired,
    nombre: PropTypes.string.isRequired,
  }).isRequired,
  /** Callback para cerrar el modal sin guardar. */
  onClose:    PropTypes.func.isRequired,
  /** Callback ejecutado tras un guardado exitoso. */
  onGuardado: PropTypes.func.isRequired,
};

export default HorarioModal;
