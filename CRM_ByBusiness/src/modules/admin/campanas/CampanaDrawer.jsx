import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Target, DollarSign, Calendar, ToggleLeft, ToggleRight, CheckCircle } from 'lucide-react';
import useTrainingScope from '../../../shared/hooks/useTrainingScope';

/**
 * CampanaDrawer — Modal compacto para crear o editar una campaña.
 * SIMPLIFICADO: Solo usa campo 'activo' (true/false)
 */
const CampanaDrawer = ({ campana, modoCreacion, onClose, onSave }) => {
  const scope = useTrainingScope();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    prioridad: 5,
    bonus_por_venta: 0,
    objetivo_ventas: 0,
    objetivo_llamadas: 0,
    freeze_dias_no_contesta: 3,
    freeze_dias_no_interesa: 30,
    es_simulacion: scope.getFilterValue(),
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (campana && !modoCreacion) {
      setForm({
        id: campana.id,
        nombre: campana.nombre || '',
        descripcion: campana.descripcion || '',
        prioridad: campana.prioridad || 5,
        bonus_por_venta: campana.bonus_por_venta || 0,
        objetivo_ventas: campana.objetivo_ventas || 0,
        objetivo_llamadas: campana.objetivo_llamadas || 0,
        freeze_dias_no_contesta: campana.freeze_dias_no_contesta || 3,
        freeze_dias_no_interesa: campana.freeze_dias_no_interesa || 30,
        es_simulacion: campana.es_simulacion ?? scope.getFilterValue(),
        fecha_inicio: campana.fecha_inicio ? campana.fecha_inicio.split('T')[0] : '',
        fecha_fin: campana.fecha_fin ? campana.fecha_fin.split('T')[0] : '',
        activo: campana.activo !== false,
      });
    }
  }, [campana, modoCreacion, scope]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' 
      ? e.target.checked 
      : e.target.type === 'number' 
        ? parseFloat(e.target.value) || 0 
        : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleActivoChange = () => {
    setForm(prev => ({ ...prev, activo: !prev.activo }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMensaje('');

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      setLoading(false);
      return;
    }

    try {
      await onSave(form);
      setMensaje(modoCreacion ? 'Campaña creada' : 'Campaña actualizada');
      setTimeout(() => {
        setMensaje('');
        onClose();
      }, 1500);
    } catch {
      setError('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-slate-900 border border-slate-800 rounded-sm px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-[#D00000]";
  const labelCls = "block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />
      
      <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-sm shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Target className="text-[#D00000]" size={16} />
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              {modoCreacion ? 'Nueva Campaña' : 'Editar Campaña'}
            </h2>
          </div>
          <button onClick={onClose} disabled={loading} className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-sm">
            <X size={16} />
          </button>
        </div>

        {/* Mensajes */}
        {mensaje && (
          <div className="mx-4 mt-2 px-2 py-1 bg-emerald-900/20 border border-emerald-900/30 rounded-sm text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
            <CheckCircle size={12} /> {mensaje}
          </div>
        )}
        {error && (
          <div className="mx-4 mt-2 px-2 py-1 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
            {error}
          </div>
        )}

        {/* Formulario Compacto */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto">
          {/* Tipo y Activo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-sm border border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-sm ${form.es_simulacion ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                  <DollarSign className={form.es_simulacion ? "text-amber-500" : "text-blue-500"} size={14} />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{form.es_simulacion ? 'Entrenamiento' : 'Real'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, es_simulacion: !prev.es_simulacion }))} disabled={!modoCreacion}>
                {form.es_simulacion ? <ToggleRight size={24} className="text-amber-500" /> : <ToggleLeft size={24} className="text-slate-600" />}
              </button>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-sm border border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-sm ${form.activo ? 'bg-emerald-500/10' : 'bg-slate-700/30'}`}>
                  <Target className={form.activo ? "text-emerald-500" : "text-slate-500"} size={14} />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{form.activo ? 'Activa' : 'Inactiva'}</p>
                </div>
              </div>
              <button type="button" onClick={handleActivoChange}>
                {form.activo ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-600" />}
              </button>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className={labelCls}>Nombre *</label>
            <input type="text" value={form.nombre} onChange={handleChange('nombre')} placeholder="Ej: Campaña Verano" className={inputCls} required />
          </div>

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea value={form.descripcion} onChange={handleChange('descripcion')} rows={2} className={`${inputCls} resize-none`} />
          </div>

          {/* Grid 3 columnas - SIN ESTADO */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Prioridad (1-10)</label>
              <input type="number" min="1" max="10" value={form.prioridad} onChange={handleChange('prioridad')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bonus (€)</label>
              <input type="number" min="0" step="0.01" value={form.bonus_por_venta} onChange={handleChange('bonus_por_venta')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha Inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={handleChange('fecha_inicio')} className={inputCls} />
            </div>
          </div>

          {/* Objetivos */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Obj. Ventas</label>
              <input type="number" min="0" value={form.objetivo_ventas} onChange={handleChange('objetivo_ventas')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Obj. Llamadas</label>
              <input type="number" min="0" value={form.objetivo_llamadas} onChange={handleChange('objetivo_llamadas')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha Fin</label>
              <input type="date" value={form.fecha_fin} onChange={handleChange('fecha_fin')} className={inputCls} />
            </div>
          </div>

          {/* Freeze */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Freeze No Contesta (días)</label>
              <input type="number" min="0" value={form.freeze_dias_no_contesta} onChange={handleChange('freeze_dias_no_contesta')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Freeze No Interesa (días)</label>
              <input type="number" min="0" value={form.freeze_dias_no_interesa} onChange={handleChange('freeze_dias_no_interesa')} className={inputCls} />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-sm text-[10px] font-medium uppercase tracking-wider">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-3 py-2 bg-[#D00000] hover:bg-[#D00000]/80 text-white rounded-sm text-[10px] font-medium uppercase tracking-wider">
              {loading ? 'Guardando...' : (modoCreacion ? 'Crear' : 'Guardar')}
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
