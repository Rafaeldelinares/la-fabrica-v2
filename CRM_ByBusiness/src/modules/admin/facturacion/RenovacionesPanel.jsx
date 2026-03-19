import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { fmtFecha, fmtMesAno } from '../../../utils/dates';

const MESES_OPCIONES = [3, 6, 9, 12, 15, 18, 20];

const fmtDate = (d) => fmtFecha(d);
const fmtEur  = (n) => n ? `${parseFloat(n).toFixed(2)} €` : '—';

const mesKey   = (dateStr) => { if (!dateStr) return 'unknown'; const d = new Date(dateStr); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const mesLabel = (dateStr) => fmtMesAno(dateStr);

const urgencyClass = (dias) => {
  if (dias <= 0)  return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (dias <= 15) return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (dias <= 30) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-slate-700/50 text-slate-400 border-slate-600';
};
const urgencyLabel = (dias) => {
  if (dias <= 0)  return 'VENCIDA';
  if (dias <= 15) return `${dias}d URGENTE`;
  if (dias <= 30) return `${dias}d PRÓXIMA`;
  return `${dias}d`;
};

const riskClass = (dias) => {
  if (!dias || dias < 30) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
  if (dias < 60)          return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
  return 'bg-red-500/15 text-red-400 border-red-500/25';
};

/**
 * Panel de renovaciones de contratos. El nombre de empresa es clickeable y abre la ficha.
 * @param {Function} onAbrirCliente - Callback para abrir ClienteDrawer con el cliente_id
 */
const RenovacionesPanel = ({ onAbrirCliente, alturaDisponible, reloadKey }) => {
  const [renovaciones, setRenovaciones] = useState(null);
  const [meses,        setMeses]        = useState(12);
  const [mesFiltro,    setMesFiltro]    = useState(null);
  const [pagina,       setPagina]       = useState(1);
  const N8N = import.meta.env.VITE_N8N_URL;

  const filasPorPagina = Math.max(5, Math.floor((alturaDisponible - 380) / 40));

  useEffect(() => { setPagina(1); }, [filasPorPagina]);

  const load = () => {
    setRenovaciones(null);
    setMesFiltro(null);
    fetch(`${N8N}/crm-renovaciones?meses=${meses}`)
      .then(r => r.json())
      .then(d => setRenovaciones(d.ok ? (d.renovaciones || []) : []))
      .catch(() => setRenovaciones([]));
  };

  useEffect(load, [meses, reloadKey]);

  const currentKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  }, []);

  const byMes = useMemo(() => {
    if (!renovaciones) return [];
    const map = {};
    renovaciones.forEach(r => {
      const k = mesKey(r.fecha_fin);
      if (!map[k]) map[k] = { key: k, label: mesLabel(r.fecha_fin), count: 0, mrr: 0 };
      map[k].count++;
      map[k].mrr += Number(r.importe_mensual || 0);
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [renovaciones]);

  const maxCount = useMemo(() => Math.max(1, ...byMes.map(m => m.count)), [byMes]);

  const lista = useMemo(() => {
    if (!renovaciones) return [];
    return mesFiltro ? renovaciones.filter(r => mesKey(r.fecha_fin) === mesFiltro) : renovaciones;
  }, [renovaciones, mesFiltro]);

  const totalMRR  = useMemo(() => (renovaciones || []).reduce((s, r) => s + Number(r.importe_mensual || 0), 0), [renovaciones]);
  const filtroMRR = useMemo(() => lista.reduce((s, r) => s + Number(r.importe_mensual || 0), 0), [lista]);
  const loading = renovaciones === null;

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden pr-1">

      {/* Controles horizonte */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Horizonte</span>
          <div className="flex gap-1">
            {MESES_OPCIONES.map(m => (
              <button
                key={m}
                onClick={() => setMeses(m)}
                className={`px-2 py-1 text-[10px] font-mono rounded-sm border transition-colors ${
                  meses === m
                    ? 'bg-[#D00000]/10 border-[#D00000]/40 text-[#D00000]'
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >{m}m</button>
            ))}
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase disabled:opacity-30">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 animate-pulse">
          <div className="flex flex-col gap-3 items-center">
            <div className="h-4 w-48 bg-slate-800 rounded-sm" />
            <div className="h-3 w-32 bg-slate-800 rounded-sm" />
          </div>
        </div>
      ) : renovaciones.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-600 text-xs font-mono">
          No hay contratos que venzan en los próximos {meses} meses
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-slate-900 border border-slate-800 rounded-sm px-4 py-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">Contratos en rango</p>
              <p className="text-2xl font-black text-white mt-1">{renovaciones.length}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-sm px-4 py-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">Ing. mensuales en riesgo</p>
              <p className="text-2xl font-black text-[#D00000] mt-1">{fmtEur(totalMRR)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-sm px-4 py-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                {mesFiltro ? 'Ing. seleccionados' : 'Meses con renovaciones'}
              </p>
              <p className="text-2xl font-black text-slate-300 mt-1">
                {mesFiltro ? fmtEur(filtroMRR) : byMes.length}
              </p>
            </div>
          </div>

          {/* CAPA 1 — Gráfico de barras por mes */}
          <div className="bg-slate-900 border border-slate-800 rounded-sm px-5 pt-4 pb-3 shrink-0">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono mb-3">
              Distribución mensual — <span className="text-slate-700">click en barra para filtrar</span>
            </p>
            <div className="flex items-end gap-1.5 h-28">
              {byMes.map(m => {
                const barH = Math.max(8, Math.round((m.count / maxCount) * 80));
                const isCurr = m.key === currentKey;
                const isSel  = mesFiltro === m.key;
                return (
                  <div
                    key={m.key}
                    className="flex flex-col items-center gap-0.5 cursor-pointer group flex-1 min-w-0"
                    onClick={() => { setMesFiltro(isSel ? null : m.key); setPagina(1); }}
                    title={`${m.label} — ${m.count} contratos — ${fmtEur(Math.round(m.mrr))}`}
                  >
                    {/* MRR hint */}
                    <span className={`text-[7px] font-mono truncate w-full text-center transition-colors ${isSel ? 'text-slate-300' : 'text-slate-700 group-hover:text-slate-500'}`}>
                      {m.mrr > 0 ? fmtEur(Math.round(m.mrr)) : ''}
                    </span>
                    {/* Count */}
                    <span className={`text-[9px] font-mono font-bold transition-colors ${isSel ? 'text-white' : isCurr ? 'text-[#D00000]' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      {m.count}
                    </span>
                    {/* Barra */}
                    <div
                      ref={el => { if (el) el.style.height = `${barH}px`; }}
                      className={`w-full rounded-sm transition-all ${isSel ? 'bg-white/90' : isCurr ? 'bg-[#D00000]/80 group-hover:bg-[#D00000]' : 'bg-slate-700 group-hover:bg-slate-500'}`}
                    />
                    {/* Mes label */}
                    <span className={`text-[7px] font-mono uppercase truncate w-full text-center transition-colors ${isSel ? 'text-white' : isCurr ? 'text-[#D00000]' : 'text-slate-600'}`}>
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {mesFiltro && (
              <div className="mt-2 flex items-center gap-2 border-t border-slate-800 pt-2">
                <span className="text-[9px] text-slate-500 font-mono">
                  Filtrando: {byMes.find(m => m.key === mesFiltro)?.label} — {lista.length} contratos — {fmtEur(filtroMRR)}
                </span>
                <button onClick={() => { setMesFiltro(null); setPagina(1); }} className="text-[9px] text-[#D00000] font-mono hover:underline">× limpiar filtro</button>
              </div>
            )}
          </div>

          {/* CAPA 2 — Lista de contratos */}
          {(() => {
            const totalPaginas = Math.ceil(lista.length / filasPorPagina);
            const paginados = lista.slice((pagina - 1) * filasPorPagina, pagina * filasPorPagina);
            return (
              <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden flex-1 flex flex-col">
                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                    {mesFiltro
                      ? `${lista.length} contratos · ${byMes.find(m => m.key === mesFiltro)?.label}`
                      : `${lista.length} contratos en el horizonte`}
                  </p>
                  <span className="text-[9px] text-slate-600 font-mono">{fmtEur(filtroMRR)} ing. mensuales</span>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left">
                    <thead className="text-[9px] text-slate-600 uppercase tracking-widest bg-slate-950/50 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">Cliente</th>
                        <th className="px-4 py-2.5">Producto</th>
                        <th className="px-4 py-2.5 font-mono">Vencimiento</th>
                        <th className="px-4 py-2.5 font-mono">Ing. mensuales</th>
                        <th className="px-4 py-2.5 font-mono">Sin contacto</th>
                        <th className="px-4 py-2.5">Gestor</th>
                        <th className="px-4 py-2.5 font-mono">Urgencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginados.map(r => (
                        <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => onAbrirCliente(r.cliente_id)}
                              className="group flex items-center gap-1 text-left"
                            >
                              <span className="font-bold text-slate-200 group-hover:text-blue-400 uppercase tracking-wide text-[11px] transition-colors">{r.nombre_comercial}</span>
                              <ExternalLink size={9} className="text-slate-700 group-hover:text-blue-400 transition-colors shrink-0" />
                            </button>
                            {r.telefono && <p className="text-[9px] text-slate-600 font-mono mt-0.5">{r.telefono}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-[11px]">{r.producto_nombre || '—'}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-300 font-bold text-[11px]">{fmtDate(r.fecha_fin)}</td>
                          <td className="px-4 py-2.5 font-mono text-emerald-400 text-[11px]">{fmtEur(r.importe_mensual)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[9px] font-mono ${riskClass(r.dias_sin_contacto)}`}>
                              {r.dias_sin_contacto != null ? `${r.dias_sin_contacto}d` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-[11px]">{r.gestor_nombre || '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[9px] font-mono ${urgencyClass(r.dias_restantes)}`}>
                              {urgencyLabel(r.dias_restantes)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPaginas > 1 && (
                  <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-950/40">
                    <span className="text-[10px] text-slate-600 font-mono">
                      {(pagina - 1) * filasPorPagina + 1}–{Math.min(pagina * filasPorPagina, lista.length)} de {lista.length}
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
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

RenovacionesPanel.propTypes = {
  onAbrirCliente:   PropTypes.func.isRequired,
  alturaDisponible: PropTypes.number.isRequired,
  reloadKey:        PropTypes.number.isRequired,
};

export default RenovacionesPanel;
