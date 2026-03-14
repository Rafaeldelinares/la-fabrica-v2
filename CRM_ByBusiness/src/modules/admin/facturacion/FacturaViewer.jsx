import React from 'react';
import { Printer, X } from 'lucide-react';

const fmtEur  = (v) => v != null ? `${parseFloat(v).toFixed(2)} €` : '0,00 €';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

/**
 * Visor/impresor de factura legal española.
 * Cumple campos obligatorios según art. 6 RD 1619/2012 y Ley Crea y Crece.
 */
const FacturaViewer = ({ factura, onClose }) => {
  const imprimir = () => {
    window.print();
  };

  const f = factura;

  return (
    <>
      {/* Overlay — oculto al imprimir */}
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8 no-print">
        <div className="w-full max-w-3xl">
          {/* Barra de acciones */}
          <div className="flex items-center justify-between mb-4 no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">FACTURA {f.numero}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={imprimir}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[#D00000] hover:bg-red-700 rounded-sm transition-colors uppercase tracking-widest"
              >
                <Printer size={13} /> Imprimir / PDF
              </button>
              <button onClick={onClose} className="p-2 text-slate-500 hover:text-white border border-slate-700 rounded-sm transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* DOCUMENTO FACTURA — este es el que se imprime */}
          <div id="factura-print" className="bg-white text-slate-900 p-10 rounded shadow-2xl factura-doc">

            {/* Cabecera */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-black tracking-wider text-slate-900 uppercase">{f.emisor_nombre}</h1>
                <p className="text-sm text-slate-600 mt-1">{f.emisor_dir}</p>
                <p className="text-sm text-slate-600">{f.emisor_cp} {f.emisor_municipio}</p>
                <p className="text-sm font-mono text-slate-700 mt-1">NIF: <strong>{f.emisor_nif}</strong></p>
              </div>
              <div className="text-right">
                <div className="inline-block border-2 border-slate-900 px-5 py-3 rounded">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">FACTURA</p>
                  <p className="text-xl font-black font-mono text-slate-900">{f.numero}</p>
                  <p className="text-xs text-slate-600 mt-1">Fecha: <strong>{fmtDate(f.fecha_emision)}</strong></p>
                  <p className="text-xs text-slate-600">Vence: {fmtDate(f.fecha_vencimiento)}</p>
                </div>
              </div>
            </div>

            {/* Línea divisoria */}
            <div className="border-t-2 border-slate-900 mb-6" />

            {/* Datos del receptor */}
            <div className="mb-6 bg-slate-50 p-4 rounded border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Facturar a</p>
              <p className="font-bold text-slate-900">{f.receptor_nombre || f.nombre_comercial}</p>
              {f.receptor_nif && <p className="text-sm text-slate-600">CIF/NIF: <strong>{f.receptor_nif}</strong></p>}
              {f.receptor_dir && <p className="text-sm text-slate-600">{f.receptor_dir}</p>}
              {f.receptor_municipio && <p className="text-sm text-slate-600">{f.receptor_municipio}</p>}
            </div>

            {/* Tabla de líneas */}
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="text-left px-3 py-2 font-bold uppercase text-[11px] tracking-wider">Descripción</th>
                  <th className="text-center px-3 py-2 font-bold uppercase text-[11px] tracking-wider w-16">Cant.</th>
                  <th className="text-right px-3 py-2 font-bold uppercase text-[11px] tracking-wider w-24">P. Unit.</th>
                  <th className="text-right px-3 py-2 font-bold uppercase text-[11px] tracking-wider w-16">IVA%</th>
                  <th className="text-right px-3 py-2 font-bold uppercase text-[11px] tracking-wider w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(f.lineas || []).map((l, i) => (
                  <tr key={i} className={`border-b border-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-3 py-2.5 text-slate-800">{l.descripcion}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-600">{l.cantidad}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{fmtEur(l.precio_unitario)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{l.tipo_iva}%</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{fmtEur(l.subtotal_sin_iva)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div className="flex justify-end mb-6">
              <div className="w-72 border border-slate-200 rounded overflow-hidden">
                <div className="flex justify-between px-4 py-2 bg-slate-50">
                  <span className="text-sm text-slate-600">Base imponible</span>
                  <span className="font-mono font-bold text-slate-800">{fmtEur(f.base_imponible)}</span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-sm text-slate-600">IVA ({f.tipo_iva}%)</span>
                  <span className="font-mono font-bold text-slate-800">{fmtEur(f.cuota_iva)}</span>
                </div>
                {parseFloat(f.tipo_irpf) > 0 && (
                  <div className="flex justify-between px-4 py-2 bg-slate-50">
                    <span className="text-sm text-slate-600">Ret. IRPF ({f.tipo_irpf}%)</span>
                    <span className="font-mono font-bold text-red-600">-{fmtEur(f.cuota_irpf)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-slate-900 text-white">
                  <span className="font-bold uppercase tracking-wider text-sm">TOTAL</span>
                  <span className="font-mono font-black text-lg">{fmtEur(f.total_con_iva)}</span>
                </div>
              </div>
            </div>

            {/* Plan de pagos fraccionado */}
            {f.fraccionado && f.num_fracciones > 1 && (
              <div className="mb-6 border border-slate-200 rounded p-4">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-3">Plan de pagos fraccionado</p>
                <div className="grid gap-1">
                  {Array.from({ length: f.num_fracciones }, (_, i) => {
                    const importe = Math.round((parseFloat(f.total_con_iva) / f.num_fracciones) * 100) / 100;
                    const fecha = new Date(f.fecha_emision);
                    fecha.setMonth(fecha.getMonth() + i);
                    return (
                      <div key={i} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0 text-sm">
                        <span className="text-slate-500">Cuota {i + 1}/{f.num_fracciones} — {fmtDate(fecha.toISOString())}</span>
                        <span className="font-mono font-bold text-slate-800">{fmtEur(importe)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Método de pago + Observaciones */}
            <div className="border-t border-slate-200 pt-4 space-y-2">
              {f.metodo_pago && (
                <p className="text-xs text-slate-600"><strong>Forma de pago:</strong> {f.metodo_pago}</p>
              )}
              {f.observaciones && (
                <p className="text-xs text-slate-600"><strong>Observaciones:</strong> {f.observaciones}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-3">
                Factura emitida al amparo del art. 6 del RD 1619/2012, de 30 de noviembre, por el que se aprueba el Reglamento por el que se regulan las obligaciones de facturación.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Estilos de impresión — solo el documento, sin overlays */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .no-print { display: none !important; }
          #factura-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
    </>
  );
};

export default FacturaViewer;
