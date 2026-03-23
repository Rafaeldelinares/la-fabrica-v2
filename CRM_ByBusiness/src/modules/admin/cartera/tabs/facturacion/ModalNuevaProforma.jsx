import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Plus, Trash2 } from 'lucide-react';

const lineaVacia = () => ({ _id: Date.now() + Math.random(), descripcion: '', cantidad: 1, precio_unitario: 0, dto_pct: 0 });
const subtotalLinea = (l) => +(l.cantidad * l.precio_unitario * (1 - l.dto_pct / 100)).toFixed(2);
const totalLineas   = (ls) => ls.reduce((s, l) => s + subtotalLinea(l), 0).toFixed(2);

const INPUT  = 'bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded-sm px-2 py-1 w-full focus:border-[#D00000] focus:outline-none';
const SELECT = 'bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono rounded-sm px-2 py-1 w-full focus:border-[#D00000] focus:outline-none cursor-pointer';
const LABEL  = 'text-[10px] text-slate-500 uppercase tracking-widest font-mono';

/**
 * ModalNuevaProforma — Modal para crear o editar una proforma con líneas de producto.
 * @param {{ cliente: object, operadorId: string|number, n8nUrl: string, onClose: Function, onCreated: Function, proformaEditar?: object }} props
 */
const ModalNuevaProforma = ({ cliente, operadorId, n8nUrl, onClose, onCreated, proformaEditar }) => {
  const editMode = !!proformaEditar;

  const [notas,         setNotas]         = useState(proformaEditar?.notas || '');
  const [fraccionado,   setFraccionado]   = useState(proformaEditar?.fraccionado || false);
  const [numFracciones, setNumFracciones] = useState(proformaEditar?.num_fracciones || 2);
  const [aplicarIva,    setAplicarIva]    = useState(proformaEditar?.iva_pct != null);
  const [ivaPct,        setIvaPct]        = useState(proformaEditar?.iva_pct ?? 21);
  const [lineas,        setLineas]        = useState(
    proformaEditar?.lineas?.length
      ? proformaEditar.lineas.map(l => ({ ...l, _id: Date.now() + Math.random(), dto_pct: l.dto_pct ?? 0, cantidad: +l.cantidad || 1, precio_unitario: +l.precio_unitario || 0 }))
      : [lineaVacia()]
  );
  const [productos,     setProductos]     = useState([]);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    fetch(`${n8nUrl}/crm-productos`)
      .then(r => r.json())
      .then(d => setProductos(d.productos || []))
      .catch(() => {});
  }, [n8nUrl]);

  const updLine = (id, field, val) =>
    setLineas(prev => prev.map(l => l._id === id ? { ...l, [field]: val } : l));

  const delLine = (id) => setLineas(prev => prev.filter(l => l._id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lineas.length) return setError('Añade al menos una línea');
    const descripciones = lineas.map(l => l.descripcion.trim().toLowerCase()).filter(Boolean);
    const hasDuplicates = descripciones.length !== new Set(descripciones).size;
    if (hasDuplicates) return setError('Hay líneas con el mismo producto. Eliminá los duplicados antes de guardar.');
    setSaving(true); setError(null);
    try {
      let proformaId;
      if (editMode) {
        const resE = await fetch(`${n8nUrl}/crm-proforma-editar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proforma_id:    proformaEditar.id,
            notas,
            fraccionado,
            num_fracciones: fraccionado ? numFracciones : 1,
            iva_pct:        aplicarIva ? ivaPct : null,
          }),
        });
        const dataE = await resE.json();
        if (!dataE.ok) throw new Error(dataE.error || 'Error al editar proforma');
        proformaId = proformaEditar.id;
      } else {
        const resP = await fetch(`${n8nUrl}/crm-proforma-crear`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id:     cliente.id,
            operador_id:    operadorId,
            notas,
            fraccionado,
            num_fracciones: fraccionado ? numFracciones : 1,
            iva_pct:        aplicarIva ? ivaPct : null,
          }),
        });
        const dataP = await resP.json();
        if (!dataP.ok) throw new Error(dataP.error || 'Error al crear proforma');
        proformaId = dataP.proforma?.id;
      }
      for (const l of lineas) {
        const r = await fetch(`${n8nUrl}/crm-proforma-linea`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proforma_id:     proformaId,
            descripcion:     l.descripcion,
            cantidad:        l.cantidad,
            precio_unitario: l.precio_unitario,
            dto_pct:         l.dto_pct,
          }),
        });
        const dL = await r.json();
        if (!dL.ok) throw new Error(`Error en línea: ${l.descripcion}`);
      }
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-700 rounded-sm shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <p className="text-xs font-black uppercase tracking-widest text-white">
            {editMode ? `Editar ${proformaEditar.numero}` : 'Nueva Proforma'} — {cliente.nombre_comercial}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 flex flex-col gap-4">

          {error && (
            <p className="text-[10px] text-red-400 font-mono bg-red-950/30 border border-red-900/40 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fraccionado} onChange={e => setFraccionado(e.target.checked)} className="accent-[#D00000]" />
              <span className={LABEL}>Pago aplazado</span>
            </label>
            {fraccionado && (
              <div className="flex items-center gap-2">
                <span className={LABEL}>Fracciones</span>
                <input
                  type="number" min={2} max={12} value={numFracciones}
                  onChange={e => setNumFracciones(+e.target.value)}
                  className="w-16 bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded-sm px-2 py-1 focus:border-[#D00000] focus:outline-none"
                />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={aplicarIva} onChange={e => setAplicarIva(e.target.checked)} className="accent-[#D00000]" />
              <span className={LABEL}>Aplicar IVA</span>
            </label>
            {aplicarIva && (
              <div className="flex items-center gap-2">
                <span className={LABEL}>IVA %</span>
                <input
                  type="number" min={0} max={100} step={0.01} value={ivaPct}
                  onChange={e => setIvaPct(+e.target.value)}
                  className="w-16 bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded-sm px-2 py-1 focus:border-[#D00000] focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <span className={LABEL}>Notas internas</span>
            <textarea
              value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              className={`${INPUT} mt-1 resize-none`}
              placeholder="Descripción o notas adicionales..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={LABEL}>Líneas</span>
              <button
                type="button" onClick={() => setLineas(p => [...p, lineaVacia()])}
                className="flex items-center gap-1 text-[10px] text-[#D00000] hover:text-red-400 font-mono uppercase tracking-widest"
              >
                <Plus size={10} /> Añadir línea
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {lineas.map(l => (
                <div key={l._id} className="grid grid-cols-[1fr_56px_80px_60px_28px] gap-2 items-end">
                  <div>
                    {productos.length > 0 && (
                      <select
                        className={`${SELECT} mb-1`}
                        value=""
                        onChange={e => {
                          const p = productos.find(x => String(x.id) === e.target.value);
                          if (!p) return;
                          updLine(l._id, 'descripcion', p.descripcion || p.nombre);
                          if (p.precio_base != null) updLine(l._id, 'precio_unitario', +p.precio_base);
                        }}
                      >
                        <option value="" disabled>— catálogo —</option>
                        {productos.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    )}
                    <input
                      className={INPUT}
                      value={l.descripcion}
                      onChange={e => updLine(l._id, 'descripcion', e.target.value)}
                      required
                      placeholder="Descripción libre o usar catálogo ↑"
                    />
                  </div>
                  <div>
                    <span className={LABEL}>Cant.</span>
                    <input type="number" min={0.01} step={0.01} className={INPUT} value={l.cantidad} onChange={e => updLine(l._id, 'cantidad', +e.target.value)} />
                  </div>
                  <div>
                    <span className={`${LABEL} text-emerald-600`}>{subtotalLinea(l).toFixed(2)}€</span>
                    <input type="number" min={0} step={0.01} className={INPUT} value={l.precio_unitario} onChange={e => updLine(l._id, 'precio_unitario', +e.target.value)} />
                  </div>
                  <div>
                    <span className={LABEL}>Dto %</span>
                    <input type="number" min={0} max={100} step={0.01} className={INPUT} value={l.dto_pct} onChange={e => updLine(l._id, 'dto_pct', +e.target.value)} placeholder="0" />
                  </div>
                  <button type="button" onClick={() => delLine(l._id)} className="text-slate-600 hover:text-red-400 pb-0.5 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            {aplicarIva ? (
              <div className="flex flex-col items-start gap-0.5">
                <p className="text-[10px] text-slate-400 font-mono">BASE: {totalLineas(lineas)}€</p>
                <p className="text-[10px] text-slate-400 font-mono">IVA ({ivaPct}%): {(+totalLineas(lineas) * ivaPct / 100).toFixed(2)}€</p>
                <p className="text-xs font-black text-white font-mono">TOTAL: {(+totalLineas(lineas) * (1 + ivaPct / 100)).toFixed(2)}€</p>
              </div>
            ) : (
              <p className="text-xs font-black text-white font-mono">TOTAL (sin IVA): {totalLineas(lineas)}€</p>
            )}
            <div className="flex gap-2">
              <button
                type="button" onClick={onClose}
                className="text-[10px] font-mono uppercase tracking-widest border border-slate-700 rounded-sm px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={saving}
                className="text-[10px] font-mono uppercase tracking-widest bg-[#D00000] hover:bg-red-800 disabled:opacity-50 text-white rounded-sm px-4 py-2 transition-colors"
              >
                {saving ? 'Guardando…' : editMode ? 'Guardar Cambios' : 'Crear Proforma'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

ModalNuevaProforma.propTypes = {
  cliente:       PropTypes.shape({ id: PropTypes.number.isRequired, nombre_comercial: PropTypes.string }).isRequired,
  operadorId:     PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  proformaEditar: PropTypes.object,
  n8nUrl:        PropTypes.string.isRequired,
  onClose:       PropTypes.func.isRequired,
  onCreated:     PropTypes.func.isRequired,
};

export default ModalNuevaProforma;
