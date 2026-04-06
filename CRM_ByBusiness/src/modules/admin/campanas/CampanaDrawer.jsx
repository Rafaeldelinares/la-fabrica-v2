import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Target, DollarSign, Users, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import Card from '../../../shared/ui/Card';

const N8N = import.meta.env.VITE_N8N_URL;

/**
 * CampanaDrawer — Drawer lateral para crear o editar una campaña.
 */
const CampanaDrawer = ({ campana, modoCreacion, onClose, onSave }) => {
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    estado: 'activa',
    prioridad: 5,
    bonus_por_venta: 0,
    objetivo_ventas: 0,
    objetivo_llamadas: 0,
    freeze_dias_no_contesta: 3,
    freeze_dias_no_interesa: 30,
    es_simulacion: false,
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar datos si es edición
  useEffect(() => {
    if (campana && !modoCreacion) {
      setForm({
        id: campana.id,
        nombre: campana.nombre || '',
        descripcion: campana.descripcion || '',
        estado: campana.estado || 'activa',
        prioridad: campana.prioridad || 5,
        bonus_por_venta: campana.bonus_por_venta || 0,
        objetivo_ventas: campana.objetivo_ventas || 0,
        objetivo_llamadas: campana.objetivo_llamadas || 0,
        freeze_dias_no_contesta: campana.freeze_dias_no_contesta || 3,
        freeze_dias_no_interesa: campana.freeze_dias_no_interesa || 30,
        es_simulacion: campana.es_simulacion || false,
        fecha_inicio: campana.fecha_inicio ? campana.fecha_inicio.split('T')[0] : '',
        fecha_fin: campana.fecha_fin ? campana.fecha_fin.split('T')[0] : '',
        activo: campana.activo !== false,
      });
    }
  }, [campana, modoCreacion]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' 
      ? e.target.checked 
      : e.target.type === 'number' 
        ? parseFloat(e.target.value) || 0 
        : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (!form.nombre.trim()) {
      setError('El nombre de la campaña es obligatorio');
      setLoading(false);
      return;
    }

    if (form.objetivo_ventas < 0 || form.objetivo_llamadas < 0) {
      setError('Los objetivos no pueden ser negativos');
      setLoading(false);
      return;
    }

    try {
      await onSave(form);
    } catch (err) {
      setError('Error al guardar la campaña');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-slate-900 border border-slate-800 rounded-sm px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#D00000] transition-colors";
  const labelCls = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";
  const selectCls = "w-full bg-slate-900 border border-slate-800 rounded-sm px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#D00000] transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg h-full bg-slate-950 border-l border-slate-800 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <Target className="text-[#D00000]" size={20} />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              {modoCreacion ? 'Nueva Campaña' : 'Editar Campaña'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-sm hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[11px] text-red-400 font-mono">
              {error}
            </div>
          )}

          {/* Tipo de campaña */}
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-sm border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-sm ${form.es_simulacion ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                {form.es_simulacion ? (
                  <DollarSign className="text-amber-500" size={18} />
                ) : (
                  <Target className="text-blue-500" size={18} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {form.es_simulacion ? 'Campaña de Entrenamiento' : 'Campaña Real'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {form.es_simulacion 
                    ? 'Para práctica de operadores en formación' 
                    : 'Campaña activa para operadores reales'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, es_simulacion: !prev.es_simulacion }))}
              className="text-slate-400 hover:text-white transition-colors"
              disabled={!modoCreacion} // No se puede cambiar el tipo después de crear
            >
              {form.es_simulacion ? (
                <ToggleRight size={28} className="text-amber-500" />
              ) : (
                <ToggleLeft size={28} className="text-slate-600" />
              )}
            </button>
          </div>

          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Target size={14} />
              Información Básica
            </h3>
            
            <div>
              <label className={labelCls}>Nombre de la Campaña *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={handleChange('nombre')}
                placeholder="Ej: Campaña Verano 2026"
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className={labelCls}>Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={handleChange('descripcion')}
                placeholder="Descripción de la campaña..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Estado</label>
                <select value={form.estado} onChange={handleChange('estado')} className={selectCls}>
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                  <option value="pausada">Pausada</option>
                  <option value="completada">Completada</option>
                </select>
              </div>
              
              <div>
                <label className={labelCls}>Prioridad (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.prioridad}
                  onChange={handleChange('prioridad')}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Fecha Inicio</label>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={handleChange('fecha_inicio')}
                  className={inputCls}
                />
              </div>
              
              <div>
                <label className={labelCls}>Fecha Fin</label>
                <input
                  type="date"
                  value={form.fecha_fin}
                  onChange={handleChange('fecha_fin')}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Objetivos y Bonus */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={14} />
              Objetivos y Recompensas
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Bonus por Venta (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.bonus_por_venta}
                  onChange={handleChange('bonus_por_venta')}
                  className={inputCls}
                />
              </div>
              
              <div>
                <label className={labelCls}>Objetivo de Ventas</label>
                <input
                  type="number"
                  min="0"
                  value={form.objetivo_ventas}
                  onChange={handleChange('objetivo_ventas')}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Objetivo de Llamadas</label>
              <input
                type="number"
                min="0"
                value={form.objetivo_llamadas}
                onChange={handleChange('objetivo_llamadas')}
                className={inputCls}
              />
            </div>
          </div>

          {/* Configuración de freeze */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} />
              Configuración de Reintentos
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Días Freeze (No Contesta)</label>
                <input
                  type="number"
                  min="0"
                  value={form.freeze_dias_no_contesta}
                  onChange={handleChange('freeze_dias_no_contesta')}
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-600 mt-1">Días de espera tras no contesta</p>
              </div>
              
              <div>
                <label className={labelCls}>Días Freeze (No Interesa)</label>
                <input
                  type="number"
                  min="0"
                  value={form.freeze_dias_no_interesa}
                  onChange={handleChange('freeze_dias_no_interesa')}
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-600 mt-1">Días de espera tras no interesa</p>
              </div>
            </div>
          </div>

          {/* Activo/Inactivo */}
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-sm border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-sm ${form.activo ? 'bg-emerald-500/10' : 'bg-slate-700/30'}`}>
                {form.activo ? (
                  <Target className="text-emerald-500" size={18} />
                ) : (
                  <Target className="text-slate-500" size={18} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {form.activo ? 'Campaña Activa' : 'Campaña Inactiva'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {form.activo 
                    ? 'Visible y operativa para los operadores' 
                    : 'No visible para los operadores'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, activo: !prev.activo }))}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {form.activo ? (
                <ToggleRight size={28} className="text-emerald-500" />
              ) : (
                <ToggleLeft size={28} className="text-slate-600" />
              )}
            </button>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-sm text-xs font-medium uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#D00000] hover:bg-[#D00000]/80 text-white rounded-sm text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : (modoCreacion ? 'Crear Campaña' : 'Guardar Cambios')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CampanaDrawer.propTypes = {
  campana: PropTypes.object,
  modoCreacion: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default CampanaDrawer;
