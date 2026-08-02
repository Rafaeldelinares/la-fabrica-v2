import React from 'react'
import { GraduationCap, Database, Info } from 'lucide-react'
import Button from '../../../shared/ui/Button'
import Card from '../../../shared/ui/Card'
import EmptyState from '../../../shared/ui/EmptyState'


/**
 * Zona 1: Filtros y lista de gestiones (sidebar izquierdo)
 * Narrativa: PASADO → PRESENTE → FUTURO (el operador lee de izquierda a derecha)
 *
 * ZONA 1 — PASADO (¿A quién llamo?)
 * - Callbacks de HOY con prioridad visual (van ANTES que leads nuevos)
 * - Cola de leads normales por prioridad (pool general — sin selección por campaña)
 * - Lista de gestiones de la sesión actual
 *
 * Nota: las campañas NO se asignan a operadores en este modelo de negocio,
 * por eso el selector de campañas se removió. Los operadores toman del pool
 * general de leads disponibles (filtrable por ciudad y tipo de negocio).
 */
const Zone1Filters = ({
  isTraining,
  localidad,
  setLocalidad,
  tipoNegocio,
  setTipoNegocio,
  errorRed,
  setErrorRed,
  handleAsignarLead,
  sessionLeads = [],
  trainingLeadsDisponibles = 0,
  // Props para modo real
  leadsDisponibles = 0,
  loading = false
}) => {
  return (
    <div className="w-72 flex flex-col gap-3">
      {isTraining ? (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-900/20 border border-amber-800/30 rounded-sm">
          <GraduationCap size={12} className="text-amber-400 shrink-0" />
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
            Modo simulación activa
          </span>
        </div>
      ) : (
        <>
          {/* Filtros tradicionales */}
          <input
            type="text"
            placeholder="Ciudad / Localidad"
            value={localidad}
            onChange={e => setLocalidad(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono"
          />
          <select
            value={tipoNegocio}
            onChange={e => setTipoNegocio(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase"
          >
            <option value="Todos">Todos</option>
            <option value="Restaurante">Restaurante</option>
            <option value="Ferretería">Ferretería</option>
            <option value="Taller">Taller</option>
            <option value="Clínica">Clínica</option>
            <option value="Otro">Otro</option>
          </select>
        </>
      )}

      {errorRed && (
        <p className="text-[10px] text-red-400 font-mono text-center py-1">{errorRed}</p>
      )}

      <Button
        variant="primary"
        className="w-full"
        onClick={() => { if (typeof setErrorRed === 'function') setErrorRed(''); handleAsignarLead(); }}
        disabled={isTraining ? trainingLeadsDisponibles === 0 : loading || leadsDisponibles === 0}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-mono">Cargando...</span>
            CARGANDO...
          </span>
        ) : isTraining ? (
          `SIGUIENTE CLIENTE (${trainingLeadsDisponibles})`
        ) : (
          `ASIGNAR SIGUIENTE LEAD (${leadsDisponibles})`
        )}
      </Button>

      <div className="flex-1 overflow-y-auto mt-2 flex flex-col gap-2 relative">
        {sessionLeads.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <EmptyState
              title="Sin gestiones en esta sesión"
              icon={Database}
              description={isTraining ? 'Tus llamadas de práctica aparecerán aquí' : 'Tus tickets finalizados aparecerán aquí'}
            />
          </div>
        ) : (
          sessionLeads.map((item, index) => (
            <div key={index} className="relative group">
              <Card className="flex justify-between items-center !p-3 rounded-sm border-slate-800">
                <span className="text-xs text-slate-200 font-bold uppercase truncate pr-2 tracking-wider">
                  {item.nombre_comercial}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono ${item.resultado === 'venta' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {item.resultado?.replace(/_/g, ' ')}
                  </span>
                  {item.asignado_por && (
                    <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="absolute bottom-full left-0 mb-1.5 w-52 bg-slate-800 border border-slate-700 rounded-sm p-2 text-[10px] text-slate-300 z-50 shadow-xl pointer-events-none">
                        <div className="font-bold text-slate-100 mb-1">
                          Asignado por: {item.asignado_por.campaign || 'Sistema'}
                        </div>
                        <div>
                          Prioridad: <span className="text-white font-mono">{item.asignado_por.prioridad || '—'}</span>
                        </div>
                        <div>
                          Fuente: <span className="text-white font-mono">{item.asignado_por.fuente || '—'}</span>
                        </div>
                      </div>
                      <Info size={10} className="text-blue-400 cursor-help shrink-0" />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Zone1Filters