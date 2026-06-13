import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Plus, Trash2, FileText } from 'lucide-react';

const N8N = import.meta.env.VITE_N8N_URL;

/** Formatea un número como precio en euros. */
const fmtEur = (v) => v != null ? `${parseFloat(v || 0).toFixed(2)} €` : '0.00 €';

const CUOTAS = [1, 2, 3, 4, 6, 12];

/** Fila de línea de proforma: producto, descripción, cantidad, precio, descuento y subtotal. */
const LineaRow = ({ linea, productos, onChange, onRemove }) => {
  const calcSubtotal = (cantidad, precio, dto) =>
    parseFloat(cantidad) * parseFloat(precio) * (1 - parseFloat(dto || 0) / 100);

  const handleProducto = (e) => {
    const prod = productos.find(p => p.id === parseInt(e.target.value));
    if (prod) onChange({ ...linea, producto_id: prod.id, descripcion: prod.nombre, precio_unitario: prod.precio_base, subtotal: calcSubtotal(linea.cantidad, prod.precio_base, linea.dto_pct) });
    else onChange({ ...linea, producto_id: '', descripcion: '', precio_unitario: 0, subtotal: 0 });
  };
  const handleCant = (e) => {
    const c = parseFloat(e.target.value) || 1;
    onChange({ ...linea, cantidad: c, subtotal: calcSubtotal(c, linea.precio_unitario, linea.dto_pct) });
  };
  const handlePrecio = (e) => {
    const p = parseFloat(e.target.value) || 0;
    onChange({ ...linea, precio_unitario: p, subtotal: calcSubtotal(linea.cantidad, p, linea.dto_pct) });
  };
  const handleDto = (e) => {
    const d = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
    onChange({ ...linea, dto_pct: d, subtotal: calcSubtotal(linea.cantidad, linea.precio_unitario, d) });
  };

  return (
    <div className="grid grid-cols-[1fr_2fr_60px_80px_56px_80px_32px] gap-2 items-center">
      <select
        value={linea.producto_id}
        onChange={handleProducto}
        className="bg-slate-950 border border-slate-700 rounded-sm text-[11px] text-slate-200 px-2 py-1.5 outline-none focus:border-[#D00000] font-mono"
      >
        <option value="">— Producto —</option>
        {productos.map(p => (
          <option key={p.id} value={p.id}>{p.numero_catalogo}. {p.nombre}</option>
        ))}
      </select>
      <input
        value={linea.descripcion}
        onChange={e => onChange({ ...linea, descripcion: e.target.value })}
        placeholder="Descripción"
        className="bg-slate-950 border border-slate-700 rounded-sm text-[11px] text-slate-200 px-2 py-1.5 outline-none focus:border-[#D00000]"
      />
      <input
        type="number" min="1" step="1"
        value={linea.cantidad}
        onChange={handleCant}
        className="bg-slate-950 border border-slate-700 rounded-sm text-[11px] text-slate-200 px-2 py-1.5 outline-none focus:border-[#D00000] font-mono text-center"
      />
      <input
        type="number" min="0" step="0.01"
        value={linea.precio_unitario}
        onChange={handlePrecio}
        className="bg-slate-950 border border-slate-700 rounded-sm text-[11px] text-slate-200 px-2 py-1.5 outline-none focus:border-[#D00000] font-mono text-right"
      />
      <div className="relative">
        <input
          type="number" min="0" max="100" step="1"
          value={linea.dto_pct}
          onChange={handleDto}
          className={`w-full bg-slate-950 border rounded-sm text-[11px] px-2 pr-4 py-1.5 outline-none font-mono text-right ${linea.dto_pct > 0 ? 'border-amber-500/60 text-amber-400' : 'border-slate-700 text-slate-200'} focus:border-[#D00000]`}
        />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">%</span>
      </div>
      <span className="text-[11px] font-mono text-white font-bold text-right">{fmtEur(linea.subtotal)}</span>
      <button onClick={onRemove} className="text-slate-600 hover:text-red-500 transition-colors flex items-center justify-center">
        <Trash2 size={13} />
      </button>
    </div>
  );
};

LineaRow.propTypes = {
  linea:     PropTypes.object.isRequired,
  productos: PropTypes.array.isRequired,
  onChange:  PropTypes.func.isRequired,
  onRemove:  PropTypes.func.isRequired,
};

const newLinea = () => ({ _id: Date.now(), producto_id: '', descripcion: '', cantidad: 1, precio_unitario: 0, dto_pct: 0, subtotal: 0 });

/** Modal de creación de proforma para un cliente: líneas, pago fraccionado y factura. */
const ProformaModal = ({ cliente, operadorId, onClose, onCreated }) => {
  const [productos, setProductos] = useState([]);
  const [lineas, setLineas] = useState([newLinea()]);
  const [fraccionado, setFraccionado] = useState(false);
  const [numFracciones, setNumFracciones] = useState(1);
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingMsg, setSavingMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${N8N}/crm-productos`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (d.ok) setProductos(d.productos); })
      .catch(() => {});
  }, []);

  const total = lineas.reduce((s, l) => s + (parseFloat(l.subtotal) || 0), 0);

  const rollback = async (proformaId) => {
    try {
      await fetch(`${N8N}/crm-proforma-borrar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proforma_id: proformaId }),
      });
    } catch { /* rollback best-effort */ }
  };

  const handleSubmit = async () => {
    const validLineas = lineas.filter(l => l.descripcion && l.precio_unitario > 0);
    if (validLineas.length === 0) { setError('Añade al menos una línea válida'); return; }
    setSaving(true); setError('');

    let proformaId = null;
    try {
      // Paso 1 — crear cabecera
      setSavingMsg('Creando proforma...');
      const r1 = await fetch(`${N8N}/crm-proforma-crear`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, operador_id: operadorId, fraccionado, num_fracciones: fraccionado ? numFracciones : 1, requiere_factura: requiereFactura, notas }),
      });
      const d1 = await r1.json();
      if (!d1.ok) throw new Error(d1.error || 'Error creando proforma');
      proformaId = d1.proforma.id;

      // Paso 2 — añadir líneas
      for (let i = 0; i < validLineas.length; i++) {
        setSavingMsg(`Añadiendo líneas (${i + 1}/${validLineas.length})...`);
        const linea = validLineas[i];
        const r2 = await fetch(`${N8N}/crm-proforma-linea`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proforma_id: proformaId, producto_id: linea.producto_id || null, descripcion: linea.descripcion, cantidad: linea.cantidad, precio_unitario: linea.precio_unitario, dto_pct: linea.dto_pct || 0 }),
        });
        const d2 = await r2.json();
        if (d2.ok === false) throw new Error(d2.error || `Error añadiendo línea ${i + 1}`);
      }

      // Paso 3 — generar plan de pagos
      setSavingMsg('Generando plan de pagos...');
      const r3 = await fetch(`${N8N}/crm-pagos-generar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proforma_id: proformaId }),
      });
      const d3 = await r3.json();
      if (d3.ok === false) throw new Error(d3.error || 'Error generando plan de pagos');

      onCreated && onCreated();
      onClose();
    } catch (e) {
      if (proformaId) await rollback(proformaId);
      setError(e.message + (proformaId ? ' — proforma revertida' : ''));
    } finally {
      setSaving(false);
      setSavingMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-sm shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-[#D00000]" />
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Nueva Proforma</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{cliente.nombre_comercial}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Cabecera columnas */}
          <div>
            <div className="grid grid-cols-[1fr_2fr_60px_80px_56px_80px_32px] gap-2 mb-2 text-[10px] text-slate-600 uppercase tracking-widest font-black">
              <span>Producto</span><span>Descripción</span><span className="text-center">Cant.</span><span className="text-right">Precio</span><span className="text-right">Dto%</span><span className="text-right">Subtotal</span><span />
            </div>
            <div className="space-y-2">
              {lineas.map((l, i) => (
                <LineaRow
                  key={l._id}
                  linea={l}
                  productos={productos}
                  onChange={updated => setLineas(ls => ls.map((x, j) => j === i ? updated : x))}
                  onRemove={() => setLineas(ls => ls.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            <button
              onClick={() => setLineas(ls => [...ls, newLinea()])}
              className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-[#D00000] transition-colors font-mono uppercase"
            >
              <Plus size={12} /> Añadir línea
            </button>
          </div>

          {/* Configuración de pago */}
          <div className="border-t border-slate-800 pt-5 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Pago fraccionado</span>
                <button
                  onClick={() => { setFraccionado(f => !f); if (!fraccionado) setNumFracciones(2); else setNumFracciones(1); }}
                  className={`w-10 h-5 rounded-sm transition-colors relative ${fraccionado ? 'bg-[#D00000]' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-sm transition-transform ${fraccionado ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
              {fraccionado && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 uppercase tracking-widest">Nº cuotas</span>
                  <div className="flex gap-1.5">
                    {CUOTAS.filter(c => c > 1).map(c => (
                      <button key={c} onClick={() => setNumFracciones(c)}
                        className={`w-8 h-7 text-[11px] font-mono font-bold rounded-sm transition-colors ${numFracciones === c ? 'bg-[#D00000] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                      >{c}</button>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Requiere factura</span>
                <button
                  onClick={() => setRequiereFactura(f => !f)}
                  className={`w-10 h-5 rounded-sm transition-colors relative ${requiereFactura ? 'bg-[#D00000]' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-sm transition-transform ${requiereFactura ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>
            <div>
              <textarea
                value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Notas internas..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] resize-none"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
          <div>
            {error && <p className="text-xs text-red-400 font-mono mb-1">{error}</p>}
            {saving && savingMsg && <p className="text-[10px] text-slate-500 font-mono mb-1">{savingMsg}</p>}
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total proforma</p>
            <p className="text-xl font-black font-mono text-white">{fmtEur(total)}</p>
            {fraccionado && numFracciones > 1 && (
              <p className="text-[10px] text-slate-500 font-mono">{numFracciones} cuotas de {fmtEur(total / numFracciones)}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-sm transition-colors uppercase tracking-widest">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 text-xs font-black text-white bg-[#D00000] hover:bg-red-700 rounded-sm transition-colors uppercase tracking-widest disabled:opacity-50"
            >
              {saving ? savingMsg || 'Guardando...' : 'Crear Proforma'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ProformaModal.propTypes = {
  /** Objeto cliente con id y nombre_comercial */
  cliente:    PropTypes.shape({ id: PropTypes.number.isRequired, nombre_comercial: PropTypes.string }).isRequired,
  /** ID del operador que crea la proforma */
  operadorId: PropTypes.number,
  /** Callback al cerrar el modal */
  onClose:    PropTypes.func.isRequired,
  /** Callback invocado tras crear la proforma con éxito */
  onCreated:  PropTypes.func,
};

export default ProformaModal;
