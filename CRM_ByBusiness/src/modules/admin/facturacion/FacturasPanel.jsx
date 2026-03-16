import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import FacturaViewer from './FacturaViewer';
import { FileText, Eye, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';

const N8N = import.meta.env.VITE_N8N_URL;

const fmtEur  = (v) => v != null ? `${parseFloat(v).toFixed(2)} €` : '—';
const fmtDate = (d) => fmtFecha(d);

const ESTADO_BADGE = {
  emitida:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cobrada:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  vencida:  'bg-red-500/10 text-red-400 border-red-500/20',
  anulada:  'bg-slate-700 text-slate-500 border-slate-600',
};

const SORT_COLS = ['numero', 'nombre_comercial', 'fecha_emision', 'fecha_vencimiento', 'total_con_iva'];

function sortFacturas(list, col, dir) {
  if (!col) return list;
  return [...list].sort((a, b) => {
    let va = a[col], vb = b[col];
    if (col === 'fecha_emision' || col === 'fecha_vencimiento') {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
    } else if (col === 'total_con_iva') {
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
    } else {
      va = (va || '').toString().toLowerCase();
      vb = (vb || '').toString().toLowerCase();
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronUp size={9} className="text-slate-700 ml-0.5" />;
  return sortDir === 'asc'
    ? <ChevronUp size={9} className="text-[#D00000] ml-0.5" />
    : <ChevronDown size={9} className="text-[#D00000] ml-0.5" />;
};

SortIcon.propTypes = { col: PropTypes.string.isRequired, sortCol: PropTypes.string, sortDir: PropTypes.string };

/**
 * Panel de facturas emitidas. El nombre de empresa es clickeable y abre la ficha del cliente.
 * @param {Function} onAbrirCliente - Callback para abrir ClienteDrawer con el cliente_id
 */
const FacturasPanel = ({ onAbrirCliente, alturaDisponible, reloadKey }) => {
  const [facturas, setFacturas] = useState(null);
  const [viewing, setViewing]   = useState(null);
  const [pagina, setPagina]     = useState(1);
  const [sortCol, setSortCol]   = useState('fecha_emision');
  const [sortDir, setSortDir]   = useState('desc');

  const filasPorPagina = Math.max(5, Math.floor((alturaDisponible - 84) / 44));

  useEffect(() => { setPagina(1); }, [filasPorPagina]);

  useEffect(() => {
    fetch(`${N8N}/crm-facturas`)
      .then(r => r.json())
      .then(d => { if (d.ok) setFacturas(d.facturas); })
      .catch(() => setFacturas([]));
  }, [reloadKey]);

  const toggleSort = (col) => {
    if (!SORT_COLS.includes(col)) return;
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPagina(1);
  };

  const thClass = (col) =>
    `px-4 py-3 font-mono select-none ${SORT_COLS.includes(col) ? 'cursor-pointer hover:text-slate-300' : ''} ${sortCol === col ? 'text-slate-300' : ''}`;

  return (
    <>
      <Card className="flex flex-col h-full bg-slate-900 border-slate-800 !p-0 overflow-hidden">
        {facturas === null ? (
          <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
            <div className="flex flex-col gap-3 items-center">
              <div className="h-4 w-48 bg-slate-800 rounded-sm" />
              <div className="h-3 w-32 bg-slate-800 rounded-sm" />
            </div>
          </div>
        ) : facturas.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <EmptyState title="Sin facturas" icon={FileText}
              description="Las facturas se generan al aceptar una proforma con 'Requiere factura' activado" />
          </div>
        ) : (() => {
          const sorted = sortFacturas(facturas, sortCol, sortDir);
          const totalPaginas = Math.ceil(sorted.length / filasPorPagina);
          const paginadas = sorted.slice((pagina - 1) * filasPorPagina, pagina * filasPorPagina);
          return (
            <>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs text-slate-400">
                  <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800">
                    <tr>
                      <th className={thClass('numero')} onClick={() => toggleSort('numero')}>
                        <span className="flex items-center">Nº FACTURA <SortIcon col="numero" sortCol={sortCol} sortDir={sortDir} /></span>
                      </th>
                      <th className={thClass('nombre_comercial')} onClick={() => toggleSort('nombre_comercial')}>
                        <span className="flex items-center">CLIENTE <SortIcon col="nombre_comercial" sortCol={sortCol} sortDir={sortDir} /></span>
                      </th>
                      <th className={thClass('fecha_emision')} onClick={() => toggleSort('fecha_emision')}>
                        <span className="flex items-center">FECHA <SortIcon col="fecha_emision" sortCol={sortCol} sortDir={sortDir} /></span>
                      </th>
                      <th className={thClass('fecha_vencimiento')} onClick={() => toggleSort('fecha_vencimiento')}>
                        <span className="flex items-center">VENCE <SortIcon col="fecha_vencimiento" sortCol={sortCol} sortDir={sortDir} /></span>
                      </th>
                      <th className="px-4 py-3 font-mono">BASE</th>
                      <th className="px-4 py-3 font-mono">IVA</th>
                      <th className={thClass('total_con_iva')} onClick={() => toggleSort('total_con_iva')}>
                        <span className="flex items-center">TOTAL <SortIcon col="total_con_iva" sortCol={sortCol} sortDir={sortDir} /></span>
                      </th>
                      <th className="px-4 py-3">PAGO</th>
                      <th className="px-4 py-3">ESTADO</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginadas.map(f => (
                      <tr key={f.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-white">{f.numero}</td>
                        <td className="px-4 py-3">
                          {f.cliente_id ? (
                            <button
                              onClick={() => onAbrirCliente(f.cliente_id)}
                              className="group flex items-center gap-1 text-left"
                            >
                              <span className="font-bold text-slate-200 group-hover:text-blue-400 uppercase tracking-wide transition-colors">{f.nombre_comercial}</span>
                              <ExternalLink size={9} className="text-slate-700 group-hover:text-blue-400 transition-colors shrink-0" />
                            </button>
                          ) : (
                            <p className="font-bold text-slate-200 uppercase tracking-wide">{f.nombre_comercial}</p>
                          )}
                          {f.receptor_nif && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{f.receptor_nif}</p>}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">{fmtDate(f.fecha_emision)}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{fmtDate(f.fecha_vencimiento)}</td>
                        <td className="px-4 py-3 font-mono text-slate-300">{fmtEur(f.base_imponible)}</td>
                        <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                          {fmtEur(f.cuota_iva)}
                          <span className="text-slate-600 ml-1">({f.tipo_iva}%)</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{fmtEur(f.total_con_iva)}</td>
                        <td className="px-4 py-3">
                          {f.fraccionado
                            ? <span className="text-[10px] text-slate-500 font-mono">{f.num_fracciones} cuotas</span>
                            : <span className="text-[10px] text-slate-600">{f.metodo_pago || '—'}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={ESTADO_BADGE[f.estado] || ESTADO_BADGE.emitida}>
                            {f.estado}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setViewing(f)}
                            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white transition-colors border border-slate-700 hover:border-slate-500 px-2 py-1 rounded-sm"
                          >
                            <Eye size={10} /> Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPaginas > 1 && (
                <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-950/40">
                  <span className="text-[10px] text-slate-600 font-mono">
                    {(pagina - 1) * filasPorPagina + 1}–{Math.min(pagina * filasPorPagina, sorted.length)} de {sorted.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                      className="px-2 py-1 text-[10px] font-mono border border-slate-700 rounded-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >‹</button>
                    <span className="text-[10px] font-mono text-slate-500 px-2">{pagina}/{totalPaginas}</span>
                    <button
                      onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                      disabled={pagina === totalPaginas}
                      className="px-2 py-1 text-[10px] font-mono border border-slate-700 rounded-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >›</button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </Card>

      {viewing && <FacturaViewer factura={viewing} onClose={() => setViewing(null)} />}
    </>
  );
};

FacturasPanel.propTypes = {
  onAbrirCliente:   PropTypes.func.isRequired,
  alturaDisponible: PropTypes.number.isRequired,
  reloadKey:        PropTypes.number.isRequired,
};

export default FacturasPanel;
