import React from 'react';
import PropTypes from 'prop-types';
import { Printer, X } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';

/** Formatea número como precio en euros con dos decimales. */
const fmtEur = (v) => v != null ? `${parseFloat(v).toFixed(2)} €` : '0,00 €';

/** URL base del servicio de generación de QR (sin dependencias externas en prod). */
const QR_SERVICE = import.meta.env.VITE_QR_SERVICE_URL || 'https://api.qrserver.com/v1/create-qr-code/';

/**
 * Fila de línea dentro de la tabla de la factura impresa.
 * @param {{ linea: Object }} props
 */
const LineaFactura = ({ linea }) => (
  <tr className="border-b border-slate-200">
    <td className="px-2 py-1.5 text-xs text-slate-800 align-top">{linea.descripcion}</td>
    <td className="px-2 py-1.5 text-xs text-center font-mono text-slate-700">{linea.cantidad}</td>
    <td className="px-2 py-1.5 text-xs text-right font-mono text-slate-700">€{parseFloat(linea.precio_unitario).toFixed(2)}</td>
    <td className="px-2 py-1.5 text-xs text-right font-mono font-bold text-slate-800">€{parseFloat(linea.subtotal_sin_iva || linea.precio_unitario * linea.cantidad).toFixed(2)}</td>
  </tr>
);

LineaFactura.propTypes = { linea: PropTypes.object.isRequired };

/**
 * Visor e impresor de factura legal — estructura idéntica a la factura de referencia ByBusiness.
 * Incluye cabecera con logo, bloques emisor/receptor, tabla de líneas, totales y pie.
 * @param {{ factura: Object, onClose: Function }} props
 */
const FacturaViewer = ({ factura, onClose }) => {
  const emisorEmpresa   = factura.emisor_empresa   || 'By Business';
  const emisorNombre    = factura.emisor_nombre    || '';
  const emisorNif       = factura.emisor_nif       || '';
  const emisorDir       = factura.emisor_dir       || '';
  const emisorCp        = factura.emisor_cp        || '';
  const emisorMunicipio = factura.emisor_municipio || '';
  const emisorTelefono  = factura.emisor_telefono  || '';
  const lineas          = factura.lineas || [];

  const imprimir = () => {
    const prev = document.title;
    document.title = `Factura-${factura.numero}`;
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
              FACTURA {factura.numero}
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
          <div id="factura-print" className="bg-white text-slate-900 shadow-2xl factura-doc">

            {/* Franja superior */}
            <div className="h-1.5 w-full bg-[#8B1E1E]" />

            <div className="px-8 pt-5 pb-8">

              {/* Cabecera: logo+dirección | datos fiscales */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <img src="/bybusiness-logo.png" alt="ByBusiness" className="h-8 object-contain mb-1.5" />
                  <p className="text-[10px] font-bold text-slate-700 uppercase">{emisorEmpresa}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{emisorDir}</p>
                  <p className="text-[9px] text-slate-500">{emisorCp} {emisorMunicipio?.toUpperCase()}</p>
                  <p className="text-[9px] text-slate-500">{emisorTelefono}</p>
                </div>
                <div className="text-[10px] text-slate-600 text-right">
                  <p className="font-bold">NIF: {emisorNif}</p>
                  <p className="mt-0.5 uppercase max-w-[180px] text-right">{emisorNombre}</p>
                </div>
              </div>

              {/* Título + Fecha */}
              <h1 className="text-xl font-black text-slate-900 mb-0.5">Factura</h1>
              <p className="text-xs font-bold mb-5 text-[#8B1E1E]">
                {fmtFecha(factura.fecha_emision)}
              </p>

              {/* Destinatario + Nº factura */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">A la atención de</p>
                  <p className="text-xs font-bold text-slate-900 uppercase">{factura.receptor_nombre || factura.nombre_comercial}</p>
                  {factura.receptor_nif && (
                    <p className="text-[10px] text-slate-700 font-bold mt-0.5">{factura.receptor_nif}</p>
                  )}
                  {factura.receptor_dir && (
                    <p className="text-[10px] text-slate-600 uppercase mt-0.5">{factura.receptor_dir}</p>
                  )}
                  {factura.receptor_municipio && (
                    <p className="text-[10px] text-slate-600 uppercase">{factura.receptor_municipio}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">N.º de factura</p>
                  <p className="text-xs font-bold text-slate-900">{factura.numero}</p>
                </div>
              </div>

              {/* Tabla de líneas */}
              <table className="w-full text-xs mb-4 border-collapse">
                <thead>
                  <tr className="bg-[#8B1E1E]">
                    <th className="text-left px-2 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider">Descripción</th>
                    <th className="text-center px-2 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider w-16">Cant.</th>
                    <th className="text-right px-2 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider w-24">P. unitario</th>
                    <th className="text-right px-2 py-1.5 text-white font-bold text-[10px] uppercase tracking-wider w-24">P. total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea, idx) => (
                    <LineaFactura key={linea.id ?? `linea-${idx}`} linea={linea} />
                  ))}
                  {lineas.length < 2 && Array.from({ length: 2 - lineas.length }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="border-b border-slate-100">
                      <td className="px-2 py-2" colSpan={4}>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <div className="flex justify-end mb-5">
                <div className="w-64 space-y-0">
                  <div className="flex justify-between px-2 py-1.5 border-b border-slate-200">
                    <span className="text-xs text-slate-600">Subtotal</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{fmtEur(factura.base_imponible)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1.5 border-b border-slate-200">
                    <span className="text-xs text-slate-600">IVA {factura.tipo_iva}%</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{fmtEur(factura.cuota_iva)}</span>
                  </div>
                  {parseFloat(factura.tipo_irpf) > 0 && (
                    <div className="flex justify-between px-2 py-1.5 border-b border-slate-200">
                      <span className="text-xs text-slate-600">Ret. IRPF ({factura.tipo_irpf}%)</span>
                      <span className="font-mono font-bold text-red-700 text-xs">-{fmtEur(factura.cuota_irpf)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-2 py-2 mt-1">
                    <span className="text-sm font-black text-slate-900 uppercase tracking-wider">Total</span>
                    <span className="font-mono font-black text-lg text-slate-900">{fmtEur(factura.total_con_iva)}</span>
                  </div>
                </div>
              </div>

              {/* Plan de pagos fraccionado */}
              {factura.fraccionado && factura.num_fracciones > 1 && (
                <div className="mb-4 border border-slate-200 p-3">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Plan de pagos fraccionado</p>
                  <div className="grid gap-0.5">
                    {Array.from({ length: factura.num_fracciones }, (_, idx) => {
                      const importe = Math.round((parseFloat(factura.total_con_iva) / factura.num_fracciones) * 100) / 100;
                      const fechaCuota = new Date(factura.fecha_emision);
                      fechaCuota.setMonth(fechaCuota.getMonth() + idx);
                      return (
                        <div key={`cuota-${idx}`} className="flex justify-between items-center py-0.5 border-b border-slate-100 last:border-0 text-[10px]">
                          <span className="text-slate-500">Cuota {idx + 1}/{factura.num_fracciones} — {fmtFecha(fechaCuota.toISOString())}</span>
                          <span className="font-mono font-bold text-slate-800">{fmtEur(importe)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Observaciones + QR VeriFactu */}
              <div className="flex justify-between items-end gap-4 mb-2">
                <div className="flex-1">
                  {factura.observaciones && (
                    <p className="text-[10px] text-slate-600 mb-2">
                      <strong>Observaciones:</strong> {factura.observaciones}
                    </p>
                  )}
                  <p className="text-[8px] text-slate-400">
                    Factura emitida al amparo del art. 6 del RD 1619/2012, de 30 de noviembre.
                  </p>
                </div>
                {/* QR VeriFactu — real si existe qr_url, placeholder si no */}
                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  {factura.qr_url ? (
                    <img
                      src={`${QR_SERVICE}?size=64x64&data=${encodeURIComponent(factura.qr_url)}`}
                      alt="QR VeriFactu AEAT"
                      className="w-16 h-16"
                    />
                  ) : (
                    <div className="w-16 h-16 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                      <span className="text-[7px] text-slate-400 text-center leading-tight">QR<br/>VeriFactu</span>
                    </div>
                  )}
                  <span className="text-[7px] text-slate-400">Verificación AEAT</span>
                </div>
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

FacturaViewer.propTypes = {
  factura: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FacturaViewer;
