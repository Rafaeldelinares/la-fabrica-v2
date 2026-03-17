import React from 'react';
import PropTypes from 'prop-types';
import { Printer, X } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';


/** Formatea número como precio en euros con dos decimales. */
const fmtEur = (v) => v != null ? `${parseFloat(v || 0).toFixed(2)} €` : '0,00 €';

/**
 * Fila de línea dentro de la tabla de la proforma impresa.
 * @param {{ linea: Object }} props
 */
const LineaProforma = ({ linea }) => {
  const total = parseFloat(linea.subtotal || linea.cantidad * linea.precio_unitario || 0);
  return (
    <tr className="border-b border-slate-200">
      <td className="px-3 py-3 text-sm text-slate-800 align-top">{linea.descripcion}</td>
      <td className="px-3 py-3 text-sm text-center font-mono text-slate-700">{linea.cantidad}</td>
      <td className="px-3 py-3 text-sm text-right font-mono text-slate-700">€{parseFloat(linea.precio_unitario).toFixed(2)}</td>
      <td className="px-3 py-3 text-sm text-right font-mono font-bold text-slate-800">€{total.toFixed(2)}</td>
    </tr>
  );
};

LineaProforma.propTypes = { linea: PropTypes.object.isRequired };

/**
 * Visor e impresor de proforma — misma estructura visual que la factura ByBusiness.
 * El documento indica claramente "PROFORMA" y no tiene numeración fiscal.
 * @param {{ proforma: Object, cliente: Object, onClose: Function }} props
 */
const ProformaViewer = ({ proforma, cliente, onClose }) => {
  const imprimir = () => window.print();

  const emisorEmpresa   = proforma.emisor_empresa  || 'By Business';
  const emisorNombre    = proforma.emisor_nombre   || '';
  const emisorNif       = proforma.emisor_nif      || '';
  const emisorDir       = proforma.emisor_dir      || '';
  const emisorCp        = proforma.emisor_cp       || '';
  const emisorMunicipio = proforma.emisor_municipio || '';
  const emisorTelefono  = proforma.emisor_telefono  || '';

  const totalBruto   = parseFloat(proforma.total || 0);
  const tipoIva      = 21;
  const baseImponible = Math.round((totalBruto / (1 + tipoIva / 100)) * 100) / 100;
  const cuotaIva     = Math.round((totalBruto - baseImponible) * 100) / 100;
  const lineas       = proforma.lineas || [];
  const referencia   = proforma.numero || `PRO-${String(proforma.id).padStart(4, '0')}`;

  return (
    <>
      {/* ── Modal overlay — oculto al imprimir ── */}
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8">
        <div className="w-full max-w-3xl">

          {/* Barra de acciones */}
          <div className="flex items-center justify-between mb-4 no-print">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">
              PROFORMA {referencia}
            </span>
            <div className="flex gap-2">
              <button
                onClick={imprimir}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[#D00000] hover:bg-red-700 rounded-sm transition-colors uppercase tracking-widest"
              >
                <Printer size={13} /> Imprimir / PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-white border border-slate-700 rounded-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── DOCUMENTO IMPRIMIBLE ── */}
          <div id="proforma-print" className="bg-white text-slate-900 shadow-2xl factura-doc">

            {/* Franja superior */}
            <div className="h-1.5 w-full bg-[#8B1E1E]" />

            <div className="px-10 pt-8 pb-10">

              {/* Cabecera: empresa | NIF+nombre | logo */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase">{emisorEmpresa}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{emisorDir}</p>
                  <p className="text-xs text-slate-600">{emisorCp} {emisorMunicipio}</p>
                  <p className="text-xs text-slate-600">{emisorTelefono}</p>
                </div>
                <div className="text-xs text-slate-700 text-left mx-6">
                  <p>NIF: {emisorNif}</p>
                  <p className="mt-0.5 uppercase font-medium max-w-[160px]">{emisorNombre}</p>
                </div>
                <img src="/bybusiness-logo.png" alt="ByBusiness" className="h-8 object-contain" />
              </div>

              {/* Título */}
              <h1 className="text-4xl font-black text-slate-900 mb-1">Proforma</h1>

              {/* Fecha */}
              <p className="text-sm font-bold mb-8 text-[#8B1E1E]">
                {fmtFecha(proforma.fecha || new Date().toISOString())}
              </p>

              {/* Destinatario + referencia */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">A la atención de</p>
                  <p className="text-sm font-bold text-slate-900 uppercase">{cliente?.nombre_comercial || ''}</p>
                  {cliente?.cif && (
                    <p className="text-xs text-slate-700 font-bold mt-0.5">{cliente.cif}</p>
                  )}
                  {cliente?.direccion && (
                    <p className="text-xs text-slate-600 uppercase mt-0.5">{cliente.direccion}</p>
                  )}
                  {cliente?.localidad && (
                    <p className="text-xs text-slate-600 uppercase">{cliente.localidad}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Ref. proforma</p>
                  <p className="text-sm font-bold text-slate-900">{referencia}</p>
                  <p className="text-[10px] text-slate-400 mt-1 italic">Documento no fiscal</p>
                </div>
              </div>

              {/* Tabla de líneas */}
              <table className="w-full text-sm mb-6 border-collapse">
                <thead>
                  <tr className="bg-[#8B1E1E]">
                    <th className="text-left px-3 py-2.5 text-white font-bold text-xs uppercase tracking-wider">Descripción</th>
                    <th className="text-center px-3 py-2.5 text-white font-bold text-xs uppercase tracking-wider w-24">Cantidad</th>
                    <th className="text-right px-3 py-2.5 text-white font-bold text-xs uppercase tracking-wider w-32">Precio unitario</th>
                    <th className="text-right px-3 py-2.5 text-white font-bold text-xs uppercase tracking-wider w-32">Precio total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea, idx) => (
                    <LineaProforma key={idx} linea={linea} />
                  ))}
                  {lineas.length < 4 && Array.from({ length: 4 - lineas.length }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="border-b border-slate-100">
                      <td className="px-3 py-4" colSpan={4}>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <div className="flex justify-end mb-8">
                <div className="w-72 space-y-0">
                  <div className="flex justify-between px-3 py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Subtotal</span>
                    <span className="font-mono font-bold text-slate-800">{fmtEur(baseImponible)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">IVA {tipoIva}% Impuestos</span>
                    <span className="font-mono font-bold text-slate-800">{fmtEur(cuotaIva)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-3 mt-1">
                    <span className="text-base font-black text-slate-900 uppercase tracking-wider">Total</span>
                    <span className="font-mono font-black text-2xl text-slate-900">{fmtEur(totalBruto)}</span>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {proforma.notas && (
                <p className="text-xs text-slate-600 mb-4">
                  <strong>Notas:</strong> {proforma.notas}
                </p>
              )}

              <p className="text-[9px] text-slate-400">
                Este documento es una proforma y no tiene valor fiscal. La factura se emitirá tras la aceptación.
              </p>

            </div>

            {/* Franja inferior */}
            <div className="h-6 w-full bg-slate-900" />

          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #proforma-print, #proforma-print * { visibility: visible; }
          .no-print { display: none !important; }
          #proforma-print { position: fixed; top: 0; left: 0; width: 100%; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </>
  );
};

ProformaViewer.propTypes = {
  proforma: PropTypes.object.isRequired,
  cliente:  PropTypes.object,
  onClose:  PropTypes.func.isRequired,
};

export default ProformaViewer;
