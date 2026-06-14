import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { FileText, Plus } from 'lucide-react';
import DatePickerField from '../../../../shared/ui/DatePickerField';
import { fmtFecha } from '../../../../utils/dates';
import ContratoDigitalSection from './ContratoDigitalSection';
import { n8nGet, n8nPost } from '../../../../shared/hooks/useN8n';

const ESTADOS_CONTRATO = ['activo', 'pausado', 'cancelado'];

const estadoClase = (estado) => {
  if (estado === 'activo')    return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  if (estado === 'cancelado') return 'bg-red-500/10 border-red-500/20 text-red-400';
  if (estado === 'pausado')   return 'bg-amber-400/10 border-amber-400/20 text-amber-400';
  return 'bg-slate-800 border-slate-700 text-slate-400';
};

/**
 * TabContratos — Pestaña de contratos activos del cliente.
 * Permite añadir nuevos servicios y cambiar el estado de contratos existentes.
 * @param {{ cliente: object, n8nUrl: string }} props
 */
const TabContratos = ({ cliente, n8nUrl }) => {
  const [contratos, setContratos] = useState(null);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ tipo_servicio: '', importe_mensual: '', fecha_inicio: '', meses: '12' });
  const [guardandoNuevo,   setGuardandoNuevo]   = useState(false);
  const [errorGuardar,     setErrorGuardar]     = useState(null);
  const [errorCarga,       setErrorCarga]       = useState(null);
  const [cambiandoEstado,  setCambiandoEstado]  = useState(null);

  const cargarContratos = useCallback(() => {
    setErrorCarga(null);
    n8nGet('crm-contratos-cliente', { cliente_id: cliente.id }, { baseUrl: n8nUrl })
      .then(data => setContratos(data.ok ? data.contratos : []))
      .catch(err => { if (import.meta.env.DEV) console.error('[TabContratos] cargar:', err); setContratos([]); setErrorCarga('Error al cargar contratos'); });
  }, [cliente.id, n8nUrl]);

  useEffect(() => { cargarContratos(); }, [cargarContratos]);

  const handleCambiarEstado = (contrato, nuevoEstado) => {
    if (contrato.estado === nuevoEstado) return;
    setCambiandoEstado(contrato.id);
    n8nPost('crm-contrato-actualizar', { contrato_id: contrato.id, estado: nuevoEstado }, { baseUrl: n8nUrl })
      .then(d => {
        if (d.ok) {
          cargarContratos();
        } else {
          setErrorCarga(d.message || d.error || 'No se pudo cambiar el estado del contrato');
        }
      })
      .catch(err => {
        if (import.meta.env.DEV) console.error('[TabContratos] cambiarEstado:', err);
        setErrorCarga('Error al cambiar estado — comprueba la conexión');
      })
      .finally(() => setCambiandoEstado(null));
  };

  const handleNuevoContrato = async () => {
    if (!nuevoForm.tipo_servicio || !nuevoForm.fecha_inicio) return;
    setGuardandoNuevo(true);
    setErrorGuardar(null);
    const fechaInicio = new Date(nuevoForm.fecha_inicio);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMonth(fechaFin.getMonth() + parseInt(nuevoForm.meses || 12));
    try {
      const data = await n8nPost('crm-contrato-crear', {
        cliente_id:      cliente.id,
        tipo_servicio:   nuevoForm.tipo_servicio,
        importe_mensual: parseFloat(nuevoForm.importe_mensual) || null,
        fecha_inicio:    nuevoForm.fecha_inicio,
        fecha_fin:       fechaFin.toISOString().slice(0, 10),
      }, { baseUrl: n8nUrl });
      if (data.ok) {
        setNuevoOpen(false);
        setNuevoForm({ tipo_servicio: '', importe_mensual: '', fecha_inicio: '', meses: '12' });
        cargarContratos();
      } else {
        setErrorGuardar(data.message || 'Error al guardar el contrato');
      }
    } catch (err) { if (import.meta.env.DEV) console.error('[TabContratos] nuevoContrato:', err); setErrorGuardar('Error al guardar el contrato'); } finally { setGuardandoNuevo(false); }
  };

  if (contratos === null) return (
    <div className="flex flex-col gap-2 px-5 py-4">
      {[1,2].map(i => <div key={i} className="h-20 bg-slate-800/40 rounded-sm animate-pulse" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {errorCarga && (
        <p className="text-[10px] text-red-400 font-mono">{errorCarga}</p>
      )}
      {contratos.length === 0 && !nuevoOpen && (
        <div className="border border-dashed border-slate-800 rounded-sm p-6 text-center">
          <p className="text-slate-600 text-xs font-mono">Sin contratos registrados</p>
        </div>
      )}

      {contratos.map((c, i) => {
        const mrr = Number(c.importe_mensual || c.mrr || 0);
        const fechaFin = c.fecha_fin || c.fecha_renovacion;
        const diasFin = fechaFin ? Math.ceil((new Date(fechaFin) - new Date()) / 86400000) : null;
        const colorFin = diasFin !== null && diasFin <= 0
          ? 'text-red-400'
          : diasFin !== null && diasFin <= 60
          ? 'text-amber-400'
          : 'text-slate-400';
        const cargando = cambiandoEstado === c.id;
        return (
          <div key={c.id || i} className="border border-slate-700 rounded-sm bg-slate-900/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-slate-500 shrink-0" />
                <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  {c.tipo_servicio || c.servicio || c.tipo || '—'}
                </p>
              </div>
              {/* Selector de estado inline */}
              <div className="flex items-center gap-1">
                {ESTADOS_CONTRATO.map(est => (
                  <button
                    key={est}
                    onClick={() => handleCambiarEstado(c, est)}
                    disabled={cargando}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-sm border transition-colors disabled:opacity-40 ${
                      (c.estado || 'activo') === est
                        ? estadoClase(est)
                        : 'bg-transparent border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {est}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 gap-x-4">
              <div>
                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-0.5">Cuota/mes</p>
                <p className="text-base font-black text-slate-200 font-mono leading-tight">
                  {mrr > 0 ? `${mrr.toFixed(0)}€` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-0.5">Inicio</p>
                <p className="text-xs text-slate-400 font-mono">{fmtFecha(c.fecha_inicio)}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-0.5">Vencimiento</p>
                <p className={`text-xs font-mono ${colorFin}`}>
                  {fmtFecha(fechaFin)}
                  {diasFin !== null && diasFin <= 60 && diasFin > 0 && (
                    <span className="block text-[9px] text-amber-500/80">en {diasFin}d</span>
                  )}
                  {diasFin !== null && diasFin <= 0 && (
                    <span className="block text-[9px] text-red-400">Vencido</span>
                  )}
                </p>
              </div>
            </div>
            {c.notas && (
              <div className="px-4 pb-3">
                <p className="text-[10px] text-slate-600 font-mono leading-relaxed">{c.notas}</p>
              </div>
            )}
          </div>
        );
      })}

      {nuevoOpen && (
        <div className="border border-slate-700 rounded-sm p-4 bg-slate-900/50 flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Nuevo servicio</p>
          <select
            value={nuevoForm.tipo_servicio}
            onChange={e => setNuevoForm(f => ({ ...f, tipo_servicio: e.target.value }))}
            className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full"
          >
            <option value="">Seleccionar servicio…</option>
            {['Premium Pro', 'SEO Local', 'Pack Starter', 'Pack Profesional', 'Pack Premium', 'Redes Sociales', 'Google Ads', 'Web'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-slate-600 font-mono mb-1">€/mes</p>
              <input type="number" placeholder="0.00" value={nuevoForm.importe_mensual}
                onChange={e => setNuevoForm(f => ({ ...f, importe_mensual: e.target.value }))}
                className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full" />
            </div>
            <div>
              <p className="text-[9px] text-slate-600 font-mono mb-1">Fecha inicio</p>
              <DatePickerField
                selected={nuevoForm.fecha_inicio ? new Date(nuevoForm.fecha_inicio) : null}
                onChange={(date) => setNuevoForm(f => ({ ...f, fecha_inicio: date ? format(date, 'yyyy-MM-dd') : '' }))}
                placeholderText="DD/MM/AAAA"
              />
            </div>
            <div>
              <p className="text-[9px] text-slate-600 font-mono mb-1">Duración (meses)</p>
              <input type="number" placeholder="12" value={nuevoForm.meses}
                onChange={e => setNuevoForm(f => ({ ...f, meses: e.target.value }))}
                className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full" />
            </div>
          </div>
          {errorGuardar && (
            <p className="text-[10px] text-red-400 font-mono">{errorGuardar}</p>
          )}
          <div className="flex gap-2 mt-1">
            <button onClick={handleNuevoContrato}
              disabled={guardandoNuevo || !nuevoForm.tipo_servicio || !nuevoForm.fecha_inicio}
              className="flex-1 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-slate-600 rounded-sm text-slate-300 hover:text-white transition-colors disabled:opacity-40">
              {guardandoNuevo ? 'Guardando…' : 'Guardar contrato'}
            </button>
            <button onClick={() => { setNuevoOpen(false); setErrorGuardar(null); }}
              className="px-3 py-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!nuevoOpen && (
        <button onClick={() => setNuevoOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-slate-700 rounded-sm text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors">
          <Plus size={11} /> Añadir nuevo servicio
        </button>
      )}

      <div className="border-t border-slate-800 mt-2 -mx-5">
        <ContratoDigitalSection cliente={cliente} n8nUrl={n8nUrl} />
      </div>
    </div>
  );
};

TabContratos.propTypes = {
  cliente: PropTypes.shape({ id: PropTypes.number.isRequired }).isRequired,
  n8nUrl:  PropTypes.string.isRequired,
};

export default TabContratos;
