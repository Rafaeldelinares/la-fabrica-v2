import { interpolarGuionRosa, GUION_ROSA } from '../../data/guionRosa';

/**
 * Teleprompter — renderiza el guion oficial de Rosa (By Business)
 * con los placeholders completados a partir de los datos del lead
 * y del operador logueado.
 *
 * Source of truth del texto: `src/data/guionRosa.js`.
 * Source of truth en engram: topic_key `script-venta-rosa`.
 *
 * @param {Object} props
 * @param {Object} props.lead   - Lead activo (scoring, nombre_comercial, nombre_contacto_real, localidad)
 * @param {Object} props.user   - Operador logueado (nombre)
 */
const Teleprompter = ({ lead, user }) => {
  const pasos = interpolarGuionRosa(lead, user);
  const operatorName = (user?.nombre || '').split(' ')[0] || 'Rosa';

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-sm p-5 font-sans flex flex-col gap-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-black">
            Guion oficial · v{GUION_ROSA.version}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Operador: <span className="text-white font-mono">{operatorName}</span>
          </p>
        </div>
        <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black">
          Rosa · By Business
        </span>
      </div>

      <ol className="flex flex-col gap-4">
        {pasos.map((paso, idx) => {
          const colorMap = {
            emerald: 'text-emerald-400',
            sky:     'text-sky-400',
            amber:   'text-amber-400',
            red:     'text-[#D00000]',
          };
          const tituloColor = colorMap[paso.color] || 'text-slate-400';
          return (
            <li key={paso.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-600">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className={`text-[10px] uppercase tracking-widest font-black ${tituloColor}`}>
                  {paso.titulo}
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed italic whitespace-pre-wrap">
                "{paso.texto}"
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default Teleprompter;
