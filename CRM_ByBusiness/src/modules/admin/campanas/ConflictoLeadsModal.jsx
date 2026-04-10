import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, X, Check } from 'lucide-react';
import Card from '../../../shared/ui/Card';

/**
 * ConflictoLeadsModal - PASO 4
 * Modal para resolver conflictos cuando hay leads ocupados en la selección
 * Muestra por cada campaña en conflicto: nombre, estado, leads en selección
 * Toggle: [Ignorar] / [Mover] - default: Ignorar
 */
const ConflictoLeadsModal = ({ campanas, onConfirmar, onCancelar, totales }) => {
  const [acciones, setAcciones] = useState(() => {
    // Por defecto, todas las campañas se ignoran
    const initial = {};
    campanas.forEach(c => {
      initial[c.campana_id] = 'ignorar';
    });
    return initial;
  });

  const handleToggle = (campanaId) => {
    setAcciones(prev => ({
      ...prev,
      [campanaId]: prev[campanaId] === 'ignorar' ? 'mover' : 'ignorar'
    }));
  };

  const campanasAMover = Object.entries(acciones)
    .filter(([, accion]) => accion === 'mover')
    .map(([campanaId]) => parseInt(campanaId));

  const totalFinal = totales.libres + (campanasAMover.length > 0 ? totales.ocupados : 0);
  const leadsIgnorados = campanasAMover.length === 0 ? totales.ocupados : 0;

  const handleConfirmar = () => {
    onConfirmar({
      mover_desde: campanasAMover.map(id => ({ campana_id: id, accion: 'mover' })),
      total_final: totalFinal,
      leads_movidos: campanasAMover.length > 0 ? totales.ocupados : 0,
      leads_ignorados: leadsIgnorados
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <Card className="w-[600px] max-h-[90vh] bg-slate-900 border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-400" size={20} />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Resolver Conflictos
            </h2>
          </div>
          <button
            onClick={onCancelar}
            className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Resumen */}
          <div className="mb-6 p-4 bg-slate-800/50 rounded-sm border border-slate-700">
            <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Resumen de selección</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-white">{totales.total.toLocaleString('es-ES')}</div>
                <div className="text-[10px] text-slate-500 uppercase">Total leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-emerald-400">{totales.libres.toLocaleString('es-ES')}</div>
                <div className="text-[10px] text-slate-500 uppercase">Libres</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-slate-400">{totales.ocupados.toLocaleString('es-ES')}</div>
                <div className="text-[10px] text-slate-500 uppercase">En campañas</div>
              </div>
            </div>
          </div>

          {/* Lista de campañas en conflicto */}
          <div className="mb-4">
            <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider">
              Campañas con leads en tu selección
            </div>

            {campanas.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No hay campañas en conflicto
              </div>
            ) : (
              <div className="space-y-3">
                {campanas.map(campana => (
                  <div
                    key={campana.campana_id}
                    className="flex items-center justify-between p-4 bg-slate-800/30 rounded-sm border border-slate-700/50 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{campana.nombre}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-sm font-medium ${
                          campana.estado === 'activa'
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {campana.estado}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Contiene leads de tu selección
                      </div>
                    </div>

                    {/* Toggle Ignorar/Mover */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(campana.campana_id)}
                        className={`px-4 py-2 rounded-sm text-xs font-medium uppercase tracking-wider transition-all ${
                          acciones[campana.campana_id] === 'ignorar'
                            ? 'bg-slate-700 text-slate-400'
                            : 'bg-slate-800 text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        Ignorar
                      </button>
                      <button
                        onClick={() => handleToggle(campana.campana_id)}
                        className={`px-4 py-2 rounded-sm text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-2 ${
                          acciones[campana.campana_id] === 'mover'
                            ? 'bg-amber-900/30 text-amber-400 border border-amber-800'
                            : 'bg-slate-800 text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        {acciones[campana.campana_id] === 'mover' && <Check size={12} />}
                        Mover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total recalculado */}
          <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Total estimado de la nueva campaña</span>
              <span className="text-xl font-black text-white">{totalFinal.toLocaleString('es-ES')} leads</span>
            </div>
            {campanasAMover.length > 0 && (
              <div className="text-[10px] text-amber-400 mt-1">
                {totales.libres.toLocaleString('es-ES')} libres + {totales.ocupados.toLocaleString('es-ES')} movidos
              </div>
            )}
            {leadsIgnorados > 0 && (
              <div className="text-[10px] text-slate-500 mt-1">
                {leadsIgnorados.toLocaleString('es-ES')} leads en campañas existentes serán ignorados
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onCancelar}
            className="px-4 py-2 rounded-sm bg-slate-800 text-slate-300 text-xs font-medium uppercase tracking-wider hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={totalFinal === 0}
            className="px-4 py-2 rounded-sm bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-xs font-bold uppercase tracking-wider hover:bg-emerald-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {totalFinal === 0 ? 'Sin leads disponibles' : `Continuar con ${totalFinal.toLocaleString('es-ES')} leads`}
          </button>
        </div>
      </Card>
    </div>
  );
};

ConflictoLeadsModal.propTypes = {
  campanas: PropTypes.arrayOf(PropTypes.shape({
    campana_id: PropTypes.number.isRequired,
    nombre: PropTypes.string.isRequired,
    estado: PropTypes.string.isRequired
  })).isRequired,
  onConfirmar: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired,
  totales: PropTypes.shape({
    total: PropTypes.number.isRequired,
    libres: PropTypes.number.isRequired,
    ocupados: PropTypes.number.isRequired
  }).isRequired
};

export default ConflictoLeadsModal;
