import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle } from 'lucide-react';

const ESTADO_BADGE = {
  emitida:  'bg-blue-900/50 text-blue-300 border border-blue-800/40',
  cobrada:  'bg-emerald-900/50 text-emerald-300 border border-emerald-800/40',
  vencida:  'bg-red-900/50 text-red-400 border border-red-800/40',
  anulada:  'bg-slate-700 text-slate-500 border border-slate-600/40',
};

/**
 * FacturasSection — Lista de facturas con líneas y control de cobro de pagos.
 * @param {{ cliente: object, n8nUrl: string }} props
 */
const FacturasSection = ({ cliente, n8nUrl }) => {
  const [facturas,  setFacturas]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [expanded,  setExpanded]  = useState({});
  const [busy,      setBusy]      = useState(null);

  const cargar = useCallback(() => {
    setLoading(true); setError(null);
    fetch(`${n8nUrl}/crm-facturas-get?cliente_id=${cliente.id}`)
      .then(r => r.json())
      .then(d => { setFacturas(d.facturas || []); setLoading(false); })
      .catch(() => { setError('Error al cargar facturas'); setLoading(false); });
  }, [cliente.id, n8nUrl]);

  useEffect(() => { cargar(); }, [cargar]);

  const cobrarPago = async (pagoId, metodo) => {
    setBusy(pagoId);
    try {
      const r = await fetch(`${n8nUrl}/crm-pago-cobrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago_id: pagoId, metodo: metodo || 'transferencia' }),
      });
      const d = await r.json();
      if (d.ok) cargar();
      else setError('Error al registrar el cobro');
    } catch {
      setError('Error de conexión');
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  if (loading) return <p className="text-[10px] text-slate-500 font-mono px-5 py-4 animate-pulse">Cargando facturas…</p>;

  return (
    <div className="flex flex-col">
      {error && <p className="text-[10px] text-red-400 font-mono px-5 py-2">{error}</p>}
      {!facturas.length && <p className="text-xs text-slate-500 font-mono px-5 py-6">No hay facturas registradas.</p>}

      {facturas.map(f => (
        <div key={f.id} className="border-b border-slate-800">
          <div
            className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-900/40 transition-colors"
            onClick={() => toggle(f.id)}
          >
            {expanded[f.id]
              ? <ChevronDown size={12} className="text-slate-500 shrink-0" />
              : <ChevronRight size={12} className="text-slate-500 shrink-0" />}
            <span className="text-xs font-mono text-slate-400 w-32 shrink-0">{f.numero || `F-${f.id}`}</span>
            <span className="text-[10px] text-slate-600 font-mono shrink-0">{f.fecha_emision}</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-sm ${ESTADO_BADGE[f.estado] || 'bg-slate-700 text-slate-400'}`}>
              {f.estado}
            </span>
            {f.verifactu_enviado && <span className="text-[10px] text-emerald-500 font-mono shrink-0">VFU✓</span>}
            <span className="text-xs font-mono text-slate-300 ml-auto">
              {Number(f.total_con_iva || f.total || 0).toFixed(2)}€
            </span>
            {f.qr_url && (
              <a
                href={f.qr_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-blue-400 hover:text-blue-300 shrink-0 transition-colors"
              >
                <ExternalLink size={11} />
              </a>
            )}
          </div>

          {expanded[f.id] && (
            <div className="px-8 pb-4 flex flex-col gap-3">

              {(f.lineas || []).length > 0 && (
                <table className="w-full text-[10px] font-mono text-slate-400">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left pb-1 font-normal text-slate-500">Descripción</th>
                      <th className="text-right pb-1 font-normal text-slate-500">Cant.</th>
                      <th className="text-right pb-1 font-normal text-slate-500">Precio</th>
                      <th className="text-right pb-1 font-normal text-slate-500">Dto%</th>
                      <th className="text-right pb-1 font-normal text-slate-500">IVA</th>
                      <th className="text-right pb-1 font-normal text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(f.lineas || []).map(l => (
                      <tr key={l.id} className="border-b border-slate-900">
                        <td className="py-1 text-slate-300">{l.descripcion}</td>
                        <td className="py-1 text-right">{l.cantidad}</td>
                        <td className="py-1 text-right">{Number(l.precio_unitario).toFixed(2)}€</td>
                        <td className="py-1 text-right">{l.dto_pct}%</td>
                        <td className="py-1 text-right">{l.tipo_iva}%</td>
                        <td className="py-1 text-right text-slate-200">{Number(l.subtotal_con_iva).toFixed(2)}€</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(f.pagos || []).length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Pagos</p>
                  {(f.pagos || []).map(p => (
                    <div key={p.id} className="flex items-center gap-3 text-[10px] font-mono">
                      <span className="text-slate-500">Fracción {p.fraccion_num}/{p.total_fracciones}</span>
                      <span className="text-slate-300">{Number(p.importe).toFixed(2)}€</span>
                      <span className="text-slate-600">{p.fecha}</span>
                      <span className={p.estado === 'cobrado' ? 'text-emerald-400' : 'text-amber-400'}>{p.estado}</span>
                      {p.estado === 'pendiente' && (
                        <button
                          disabled={busy === p.id}
                          onClick={() => cobrarPago(p.id, p.metodo)}
                          className="flex items-center gap-1 border border-emerald-800 rounded-sm px-2 py-0.5 text-emerald-400 hover:bg-emerald-900/20 disabled:opacity-40 transition-colors uppercase tracking-wider"
                        >
                          <CheckCircle size={9} /> Cobrar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      ))}
    </div>
  );
};

FacturasSection.propTypes = {
  cliente: PropTypes.shape({ id: PropTypes.number.isRequired }).isRequired,
  n8nUrl:  PropTypes.string.isRequired,
};

export default FacturasSection;
