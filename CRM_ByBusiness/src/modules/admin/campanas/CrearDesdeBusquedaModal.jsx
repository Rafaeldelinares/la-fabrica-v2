import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Search, Loader, AlertCircle, Target, Check } from 'lucide-react';
import { n8nPost } from '../../../shared/hooks/useN8n';
/**
 * CrearDesdeBusquedaModal — Modal para crear una campaña a partir de un
 * query sobre la tabla de leads. El admin pone los filtros, ve un preview
 * con la cantidad de leads que matchean, y confirma.
 *
 * Filtros disponibles:
 * - categoria (LIKE parcial, case-insensitive)
 * - provincia (exacto)
 * - localidad (LIKE parcial)
 * - codigo_postal_prefix (prefijo del texto direccion)
 * - scoring_min (numérico)
 * - solo_con_telefono (default true; filtra teléfonos basura)
 * - solo_sin_campana_activa (default true; evita duplicar)
 * - solo_no_en_lista_negra (default true)
 * - solo_no_en_freeze (default true)
 *
 * Flujo:
 * 1. Admin completa filtros
 * 2. Click "Ver cuántos leads" → preview action
 * 3. Si count > 0, click "Crear campaña" → create action
 * 4. Backend crea la campaña, asigna leads, devuelve id
 * 5. onSuccess() recarga lista
 */
const CrearDesdeBusquedaModal = ({ onCerrar, onSuccess }) => {
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    provincia: '',
    localidad: '',
    codigo_postal_prefix: '',
    scoring_min: '',
    objetivo_llamadas: 100,
    solo_con_telefono: true,
    solo_sin_campana_activa: true,
    solo_no_en_lista_negra: true,
    solo_no_en_freeze: true,
  });
  const [previewCount, setPreviewCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    // Reset preview cuando cambia un filtro
    if (previewCount !== null) setPreviewCount(null);
  };

  const toggleBool = (campo) => {
    update(campo, !form[campo]);
  };

  const handlePreview = async () => {
    setError('');
    setPreviewLoading(true);
    try {
      const data = await n8nPost('crm-campana-crear-desde-busqueda', {
        action: 'preview',
        categoria: form.categoria || null,
        provincia: form.provincia || null,
        localidad: form.localidad || null,
        codigo_postal_prefix: form.codigo_postal_prefix || null,
        solo_con_telefono: form.solo_con_telefono,
        solo_sin_campana_activa: form.solo_sin_campana_activa,
        solo_no_en_lista_negra: form.solo_no_en_lista_negra,
        solo_no_en_freeze: form.solo_no_en_freeze,
        scoring_min: form.scoring_min ? Number(form.scoring_min) : null,
      });
      if (data.ok) {
        setPreviewCount(data.leads_disponibles);
      } else {
        setError(data.error || 'Error al calcular preview');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCrear = async () => {
    if (!form.nombre.trim()) {
      setError('El nombre de la campaña es obligatorio');
      return;
    }
    if (previewCount === null) {
      setError('Primero hacé el preview para ver cuántos leads hay');
      return;
    }
    if (previewCount === 0) {
      setError('No hay leads que matcheen — ajustá los filtros');
      return;
    }
    setError('');
    setCreateLoading(true);
    try {
      const data = await n8nPost('crm-campana-crear-desde-busqueda', {
        action: 'create',
        nombre: form.nombre,
        categoria: form.categoria || null,
        provincia: form.provincia || null,
        localidad: form.localidad || null,
        codigo_postal_prefix: form.codigo_postal_prefix || null,
        objetivo_llamadas: Number(form.objetivo_llamadas) || 0,
        solo_con_telefono: form.solo_con_telefono,
        solo_sin_campana_activa: form.solo_sin_campana_activa,
        solo_no_en_lista_negra: form.solo_no_en_lista_negra,
        solo_no_en_freeze: form.solo_no_en_freeze,
        scoring_min: form.scoring_min ? Number(form.scoring_min) : null,
        max_resultados: 500,
      });
      if (data.ok) {
        onSuccess?.({ campana_id: data.campana_id, leads_asignados: data.leads_asignados });
      } else {
        setError(data.error || 'Error al crear la campaña');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setCreateLoading(false);
    }
  };

  const inputCls =
    'w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:border-[#D00000] focus:outline-none transition-colors';

  const checkboxCls =
    'w-4 h-4 rounded-sm bg-slate-950 border border-slate-800 text-[#D00000] focus:ring-0 focus:ring-offset-0 cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D00000]/10 rounded-sm">
              <Target className="text-[#D00000]" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wider uppercase">
                Crear campaña desde búsqueda
              </h3>
              <p className="text-xs text-slate-500">
                Filtrá los leads de la base y armá la campaña en un solo paso
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="text-slate-500 hover:text-white text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {error && (
            <div className="bg-red-950/40 border border-red-900/50 rounded-sm p-3 flex items-start gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Bloque: nombre y objetivo */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Identidad de la campaña
            </h4>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                placeholder="Ej: Cafeterías Madrid Q3 2026"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Objetivo de llamadas</label>
              <input
                type="number"
                min="0"
                value={form.objetivo_llamadas}
                onChange={(e) => update('objetivo_llamadas', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Bloque: filtros de búsqueda */}
          <div className="space-y-3 border-t border-slate-800 pt-5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Filtros de leads
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Categoría</label>
                <input
                  type="text"
                  value={form.categoria}
                  onChange={(e) => update('categoria', e.target.value)}
                  placeholder="Ej: cafeteria, dentista…"
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-600 mt-1">Match parcial, case-insensitive</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Provincia</label>
                <input
                  type="text"
                  value={form.provincia}
                  onChange={(e) => update('provincia', e.target.value)}
                  placeholder="Ej: Madrid"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Localidad</label>
                <input
                  type="text"
                  value={form.localidad}
                  onChange={(e) => update('localidad', e.target.value)}
                  placeholder="Opcional"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Scoring mínimo</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={form.scoring_min}
                  onChange={(e) => update('scoring_min', e.target.value)}
                  placeholder="0.0 a 10.0"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Bloque: switches */}
          <div className="space-y-2 border-t border-slate-800 pt-5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Restricciones
            </h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.solo_con_telefono}
                onChange={() => toggleBool('solo_con_telefono')}
                className={checkboxCls}
              />
              <span className="text-xs text-slate-300">Solo leads con teléfono válido</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.solo_sin_campana_activa}
                onChange={() => toggleBool('solo_sin_campana_activa')}
                className={checkboxCls}
              />
              <span className="text-xs text-slate-300">
                Solo leads sin campaña activa
                <span className="text-slate-600 ml-1">(desmarcar para re-asignar leads)</span>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.solo_no_en_lista_negra}
                onChange={() => toggleBool('solo_no_en_lista_negra')}
                className={checkboxCls}
              />
              <span className="text-xs text-slate-300">Excluir leads en lista negra</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.solo_no_en_freeze}
                onChange={() => toggleBool('solo_no_en_freeze')}
                className={checkboxCls}
              />
              <span className="text-xs text-slate-300">Excluir leads en freeze</span>
            </label>
          </div>

          {/* Preview */}
          <div className="border-t border-slate-800 pt-5">
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white text-xs font-bold uppercase tracking-widest rounded-sm border border-slate-700 transition-colors py-3"
            >
              {previewLoading ? (
                <>
                  <Loader className="w-3 h-3 animate-spin" />
                  Calculando…
                </>
              ) : (
                <>
                  <Search size={14} />
                  Ver cuántos leads matchean
                </>
              )}
            </button>
            {previewCount !== null && (
              <div
                className={`mt-3 p-3 rounded-sm border ${
                  previewCount > 0
                    ? 'bg-emerald-950/30 border-emerald-900/50'
                    : 'bg-amber-950/30 border-amber-900/50'
                }`}
              >
                <p className="text-xs text-slate-300">
                  {previewCount > 0 ? (
                    <>
                      <strong className="text-emerald-400 text-sm">{previewCount}</strong> leads
                      disponibles para asignar
                    </>
                  ) : (
                    <>
                      <strong className="text-amber-400 text-sm">0</strong> leads matchean. Ajustá
                      los filtros.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800 sticky bottom-0 bg-slate-900">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={createLoading || previewCount === null || previewCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#D00000] hover:bg-[#D00000]/80 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium uppercase tracking-widest rounded-sm transition-colors"
          >
            {createLoading ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {createLoading ? 'Creando…' : 'Crear campaña'}
          </button>
        </div>
      </div>
    </div>
  );
};

CrearDesdeBusquedaModal.propTypes = {
  onCerrar: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default CrearDesdeBusquedaModal;
