import React from 'react';
import PropTypes from 'prop-types';
import { Printer, X } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';


/** Formatea número como precio en euros con dos decimales. */
const fmtEur = (v) => v != null ? `${parseFloat(v || 0).toFixed(2)} €` : '0,00 €';

/**
 * Fila de línea dentro de la tabla de la proforma impresa.
 * @param {{ linea: Object, hayDescuentos: boolean }} props
 */
const LineaProforma = ({ linea, hayDescuentos }) => {
  const total = parseFloat(linea.subtotal || linea.cantidad * linea.precio_unitario || 0);
  const dto   = parseFloat(linea.dto_pct || 0);
  return (
    <tr className="border-b border-slate-200">
      <td className="px-2 py-1.5 text-xs text-slate-800 align-top">{linea.descripcion}</td>
      <td className="px-2 py-1.5 text-xs text-center font-mono text-slate-700">{linea.cantidad}</td>
      <td className="px-2 py-1.5 text-xs text-right font-mono text-slate-700">€{parseFloat(linea.precio_unitario).toFixed(2)}</td>
      {hayDescuentos && (
        <td className="px-2 py-1.5 text-xs text-right font-mono text-amber-700">
          {dto > 0 ? `${dto}%` : '—'}
        </td>
      )}
      <td className="px-2 py-1.5 text-xs text-right font-mono font-bold text-slate-800">€{total.toFixed(2)}</td>
    </tr>
  );
};

LineaProforma.propTypes = { linea: PropTypes.object.isRequired, hayDescuentos: PropTypes.bool };

/**
 * Visor e impresor de proforma — misma estructura visual que la factura ByBusiness.
 * El documento indica claramente "PROFORMA" y no tiene numeración fiscal.
 * @param {{ proforma: Object, cliente: Object, onClose: Function }} props
 */
const ProformaViewer = ({ proforma, cliente, onClose }) => {
  const emisorEmpresa   = proforma.emisor_empresa  || 'By Business';
  const emisorNombre    = proforma.emisor_nombre   || '';
  const emisorNif       = proforma.emisor_nif      || '';
  const emisorDir       = proforma.emisor_dir      || '';
  const emisorCp        = proforma.emisor_cp       || '';
  const emisorMunicipio = proforma.emisor_municipio || '';
  const emisorTelefono  = proforma.emisor_telefono  || '';

  const totalBruto    = parseFloat(proforma.total || 0);
  const tipoIva       = 21;
  const baseImponible = Math.round((totalBruto / (1 + tipoIva / 100)) * 100) / 100;
  const cuotaIva      = Math.round((totalBruto - baseImponible) * 100) / 100;
  const lineas        = proforma.lineas || [];
  const hayDescuentos = lineas.some(l => parseFloat(l.dto_pct || 0) > 0);
  const referencia    = proforma.numero || `PRO-${String(proforma.id).padStart(4, '0')}`;

  const imprimir = () => {
    const prev = document.title;
    document.title = `Proforma-${referencia}`;
    window.print();
    document.title = prev;
  };

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

            <div className="px-8 pt-5 pb-8">

              {/* Cabecera: logo+dirección | datos fiscales */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <img src="/bybusiness-logo.png" alt="ByBusiness" className="h-8 object-contain mb-2" />
                  <p className="text-[10px] font-bold text-slate-700 uppercase">{emisorEmpresa}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{emisorDir}</p>
                  <p className="text-[9px] text-slate-500">{emisorCp} {emisorMunicipio}</p>
                  <p className="text-[9px] text-slate-500">{emisorTelefono}</p>
                </div>
                <div className="text-[10px] text-slate-600 text-right">
                  <p className="font-bold">NIF: {emisorNif}</p>
                  <p className="mt-0.5 uppercase max-w-[180px] text-right">{emisorNombre}</p>
                </div>
              </div>

              {/* Título */}
              <h1 className="text-xl font-black text-slate-900 mb-0.5">Proforma</h1>

              {/* Fecha */}
              <p className="text-xs font-bold mb-5 text-[#8B1E1E]">
                {fmtFecha(proforma.fecha || new Date().toISOString())}
              </p>

              {/* Destinatario + referencia */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">A la atención de</p>
                  <p className="text-xs font-bold text-slate-900 uppercase">{cliente?.nombre_comercial || ''}</p>
                  {cliente?.cif && (
                    <p className="text-[10px] text-slate-700 font-bold mt-0.5">{cliente.cif}</p>
                  )}
                  {cliente?.direccion && (
                    <p className="text-[10px] text-slate-600 uppercase mt-0.5">{cliente.direccion}</p>
                  )}
                  {cliente?.localidad && (
                    <p className="text-[10px] text-slate-600 uppercase">{cliente.localidad}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Ref. proforma</p>
                  <p className="text-xs font-bold text-slate-900">{referencia}</p>
                  <p className="text-[10px] text-slate-400 mt-1 italic">Documento no fiscal</p>
                </div>
              </div>

              {/* Tabla de líneas */}
              <table className="w-full text-xs mb-4 border-collapse">
                <thead>
                  <tr className="bg-[#8B1E1E]">
                    <th className="text-left px-2 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider">Descripción</th>
                    <th className="text-center px-2 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider w-16">Cant.</th>
                    <th className="text-right px-2 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider w-24">P. unitario</th>
                    {hayDescuentos && <th className="text-right px-2 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider w-16">Dto%</th>}
                    <th className="text-right px-2 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider w-24">P. total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea, idx) => (
                    <LineaProforma key={linea.id ?? `linea-${idx}`} linea={linea} hayDescuentos={hayDescuentos} />
                  ))}
                  {lineas.length < 2 && Array.from({ length: 2 - lineas.length }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="border-b border-slate-100">
                      <td className="px-2 py-2" colSpan={hayDescuentos ? 5 : 4}>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <div className="flex justify-end mb-5">
                <div className="w-64 space-y-0">
                  <div className="flex justify-between px-2 py-1.5 border-b border-slate-200">
                    <span className="text-xs text-slate-600">Subtotal</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{fmtEur(baseImponible)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1.5 border-b border-slate-200">
                    <span className="text-xs text-slate-600">IVA {tipoIva}%</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{fmtEur(cuotaIva)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-2 mt-1">
                    <span className="text-sm font-black text-slate-900 uppercase tracking-wider">Total</span>
                    <span className="font-mono font-black text-lg text-slate-900">{fmtEur(totalBruto)}</span>
                  </div>
                </div>
              </div>

              {/* Notas + QR VeriFactu (solo en facturas, aquí placeholder informativo) */}
              <div className="flex justify-between items-end gap-4 mb-2">
                <div className="flex-1">
                  {proforma.notas && (
                    <p className="text-[10px] text-slate-600 mb-2">
                      <strong>Notas:</strong> {proforma.notas}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400">
                    Este documento es una proforma y no tiene valor fiscal. La factura se emitirá tras la aceptación.
                  </p>
                </div>
                {/* Espacio reservado — el QR VeriFactu aplica a facturas definitivas, no a proformas */}
                <div className="shrink-0 w-16 h-16" />
              </div>

            </div>

            {/* Franja inferior */}
            <div className="h-4 w-full bg-slate-900" />

          </div>
        </div>
      </div>

      {/* Estilos de impresión en src/index.css */}
    </>
  );
};

ProformaViewer.propTypes = {
  proforma: PropTypes.object.isRequired,
  cliente:  PropTypes.object,
  onClose:  PropTypes.func.isRequired,
};

export default ProformaViewer;
