import React, { useState, useEffect } from 'react';
import Badge from '../../../shared/ui/Badge';
import { X, Plus, Trash2, FileText } from 'lucide-react';

const fmtEur = (v) => v != null ? `${parseFloat(v || 0).toFixed(2)} €` : '0.00 €';

const CUOTAS = [1, 2, 3, 4, 6, 12];

const LineaRow = ({ linea, productos, onChange, onRemove }) => {
  const handleProducto = (e) => {
    const prod = productos.find(p => p.id === parseInt(e.target.value));
    if (prod) onChange({ ...linea, producto_id: prod.id, descripcion: prod.nombre, precio_unitario: prod.precio_base, subtotal: prod.precio_base * linea.cantidad });
    else onChange({ ...linea, producto_id: '', descripcion: '', precio_unitario: 0, subtotal: 0 });
  };
  const handleCant = (e) => {
    const c = parseFloat(e.target.value) || 1;
    onChange({ ...linea, cantidad: c, subtotal: c * linea.precio_unitario });
  };
  const handlePrecio = (e) => {
    const p = parseFloat(e.target.value) || 0;
    onChange({ ...linea, precio_unitario: p, subtotal: linea.cantidad * p });
  };

  return (
    <div className="grid grid-cols-[1fr_2fr_60px_80px_80px_32px] gap-2 items-center">
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
      <span className="text-[11px] font-mono text-white font-bold text-right">{fmtEur(linea.subtotal)}</span>
      <button onClick={onRemove} className="text-slate-600 hover:text-red-500 transition-colors flex items-center justify-center">
        <Trash2 size={13} />
      </button>
    </div>
  );
};

const newLinea = () => ({ _id: Date.now(), producto_id: '', descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 });

const ProformaModal = ({ cliente, operadorId, onClose, onCreated }) => {
  const N8N = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';
  const [productos, setProductos] = useState([]);
  const [lineas, setLineas] = useState([newLinea()]);
  const [fraccionado, setFraccionado] = useState(false);
  const [numFracciones, setNumFracciones] = useState(1);
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${N8N}/crm-productos`)
      .then(r => r.json())
      .then(d => { if (d.ok) setProductos(d.productos); })
      .catch(() => {});
  }, []);

  const total = lineas.reduce((s, l) => s + (parseFloat(l.subtotal) || 0), 0);

  const handleSubmit = async () => {
    const validLineas = lineas.filter(l => l.descripcion && l.precio_unitario > 0);
    if (validLineas.length === 0) { setError('Añade al menos una línea válida'); return; }
    setSaving(true); setError('');
    try {
      // 1. Crear proforma
      const r1 = await fetch(`${N8N}/crm-proforma-crear`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, operador_id: operadorId, fraccionado, num_fracciones: fraccionado ? numFracciones : 1, requiere_factura: requiereFactura, notas }),
      });
      const d1 = await r1.json();
      if (!d1.ok) throw new Error(d1.error || 'Error creando proforma');
      const proformaId = d1.proforma.id;

      // 2. Añadir líneas
      for (const linea of validLineas) {
        await fetch(`${N8N}/crm-proforma-linea`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proforma_id: proformaId, producto_id: linea.producto_id || null, descripcion: linea.descripcion, cantidad: linea.cantidad, precio_unitario: linea.precio_unitario }),
        });
      }

      // 3. Generar pagos
      await fetch(`${N8N}/crm-pagos-generar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proforma_id: proformaId }),
      });

      onCreated && onCreated();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

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
            <div className="grid grid-cols-[1fr_2fr_60px_80px_80px_32px] gap-2 mb-2 text-[10px] text-slate-600 uppercase tracking-widest font-black">
              <span>Producto</span><span>Descripción</span><span className="text-center">Cant.</span><span className="text-right">Precio</span><span className="text-right">Subtotal</span><span />
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
                  className={`w-10 h-5 rounded-full transition-colors relative ${fraccionado ? 'bg-[#D00000]' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${fraccionado ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
                  className={`w-10 h-5 rounded-full transition-colors relative ${requiereFactura ? 'bg-[#D00000]' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${requiereFactura ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
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
              {saving ? 'Guardando...' : 'Crear Proforma'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProformaModal;
