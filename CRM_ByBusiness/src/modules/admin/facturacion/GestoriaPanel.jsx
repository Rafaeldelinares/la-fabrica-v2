import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import { Building2, Mail, Send, History, FileSpreadsheet, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';
import { n8nGet, n8nPost } from '../../../shared/hooks/useN8n';

const GestoriaPanel = () => {
  const [config, setConfig] = useState(null);
  const [envios, setEnvios] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [envioBusy, setEnvioBusy] = useState(false);
  const [error, setError] = useState(null);
  
  const [rango, setRango] = useState({ 
    desde: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString().slice(0, 10),
    hasta: new Date().toISOString().slice(0, 10)
  });

  /** Carga configuración, historial de envíos y facturas pendientes en paralelo. */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [resConfig, resEnvios, resPend] = await Promise.all([
        n8nGet('crm-gestor-config'),
        n8nGet('crm-gestor-envios'),
        n8nGet('crm-gestor-pendientes', { desde: rango.desde, hasta: rango.hasta })
      ]);

      if (!resConfig.ok) throw new Error(resConfig.error || 'Error del servidor');
      if (!resEnvios.ok) throw new Error(resEnvios.error || 'Error del servidor');
      if (!resPend.ok)   throw new Error(resPend.error   || 'Error del servidor');

      setConfig(resConfig.config);
      setEnvios(resEnvios.envios);
      setPendientes(resPend.pendientes);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[GestoriaPanel] Error al cargar datos:', err);
      setError('Error al cargar datos. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [rango]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /** Guarda la configuración del gestor (nombre, contacto, email) en el servidor. */
  const saveConfig = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      const resData = await n8nPost('crm-gestor-config-update', data);
      if (!resData.ok) throw new Error(resData.error || 'Error del servidor');
      loadAll();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[GestoriaPanel] Error al guardar configuración:', err);
      setError('Error al guardar la configuración.');
    }
  };

  /** Envía un lote de facturas pendientes al gestor en el rango de fechas seleccionado. */
  const enviarAlGestor = async () => {
    if (!config?.email) { setError('Configura primero el email del gestor'); return; }
    if (pendientes.length === 0) { setError('No hay facturas pendientes en este rango'); return; }

    setEnvioBusy(true);
    try {
      const data = await n8nPost('crm-gestor-enviar-lote', {
        desde: rango.desde,
        hasta: rango.hasta,
        facturas_ids: pendientes.map(f => f.id)
      });
      if (!data.ok) throw new Error(data.error || 'Error del servidor');
      loadAll();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[GestoriaPanel] Error al enviar lote de facturas:', err);
      setError('Error al enviar el lote de facturas.');
    } finally {
      setEnvioBusy(false);
    }
  };

  /** Abre el documento del envío en nueva pestaña si la URL está disponible */
  const abrirDocumento = (url) => { if (url) window.open(url, '_blank', 'noreferrer'); };

  if (loading && !config) return <div className="text-slate-500 font-mono text-xs animate-pulse p-10">Cargando datos de gestoría...</div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-sm text-red-300 text-sm flex justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CONFIGURACIÓN */}
        <Card className="lg:col-span-1 bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6 text-[#D00000]">
            <Building2 size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Datos del Gestor</h2>
          </div>
          
          <form onSubmit={saveConfig} className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Nombre Gestoría</label>
              <input name="nombre_gestoria" defaultValue={config?.nombre_gestoria} className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-white outline-none focus:border-[#D00000]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Persona de Contacto</label>
              <input name="nombre" defaultValue={config?.nombre} className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-white outline-none focus:border-[#D00000]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Email Recibo Facturas</label>
              <input name="email" defaultValue={config?.email} className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-white outline-none focus:border-[#D00000]/50 transition-colors" />
            </div>
            <button type="submit" className="w-full bg-slate-800 hover:bg-[#D00000] text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-sm transition-all">
              Guardar Configuración
            </button>
          </form>
        </Card>

        {/* ENVÍO DE LOTE */}
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-blue-400">
              <Send size={18} />
              <h2 className="text-sm font-black uppercase tracking-widest">Envío masivo a Gestoría</h2>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-sm border border-slate-800">
              <input type="date" value={rango.desde} onChange={e => setRango({...rango, desde: e.target.value})} className="bg-transparent text-[10px] text-slate-300 font-mono outline-none px-2" />
              <span className="text-slate-700">/</span>
              <input type="date" value={rango.hasta} onChange={e => setRango({...rango, hasta: e.target.value})} className="bg-transparent text-[10px] text-slate-300 font-mono outline-none px-2" />
            </div>
          </div>

          <div className="flex-1 min-h-[200px] border border-slate-800/50 rounded-sm bg-slate-950/30 overflow-hidden mb-4">
            {pendientes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10 opacity-40">
                <CheckCircle size={32} className="text-emerald-500 mb-2" />
                <p className="text-[10px] font-mono uppercase tracking-widest">Todo al día</p>
                <p className="text-[9px] text-slate-500">No hay facturas pendientes en este rango</p>
              </div>
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-950 text-[9px] text-slate-600 uppercase font-black tracking-tighter">
                  <tr>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Nº Factura</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {pendientes.map(f => (
                    <tr key={f.id} className="hover:bg-slate-800/20">
                      <td className="px-4 py-2 font-mono text-slate-500">{fmtFecha(f.fecha_emision)}</td>
                      <td className="px-4 py-2 font-mono text-white">{f.numero}</td>
                      <td className="px-4 py-2 text-slate-400 truncate max-w-[150px]">{f.nombre_comercial}</td>
                      <td className="px-4 py-2 font-mono text-white text-right">{parseFloat(f.total_con_iva).toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[10px] text-slate-500 font-mono">
              <span className="text-white font-bold">{pendientes.length}</span> documentos seleccionados · 
              Total: <span className="text-emerald-400 font-bold">{pendientes.reduce((suma, factura) => suma + parseFloat(factura.total_con_iva||0), 0).toFixed(2)}€</span>
            </div>
            <button 
              onClick={enviarAlGestor}
              disabled={envioBusy || pendientes.length === 0}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:grayscale text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-sm transition-all shadow-lg shadow-blue-900/20"
            >
              <Mail size={14} />
              {envioBusy ? 'Enviando lote...' : 'Enviar ahora al Gestor'}
            </button>
          </div>
        </Card>
      </div>

      {/* HISTORIAL DE ENVÍOS */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6 text-slate-400">
          <History size={18} />
          <h2 className="text-sm font-black uppercase tracking-widest">Historial de Envíos Realizados</h2>
        </div>

        {envios.length === 0 ? (
          <EmptyState title="Sin envíos" icon={Clock} description="Aparecerán aquí los lotes confirmados por el gestor" />
        ) : (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 text-[9px] text-slate-600 uppercase font-black tracking-widest">
                <tr>
                  <th className="px-4 py-3">Fecha Envío</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Docs</th>
                  <th className="px-4 py-3">Importe</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Archivos</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {envios.map(envio => (
                  <tr key={envio.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-white">{fmtFecha(envio.enviado_at)}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{fmtFecha(envio.periodo_desde)} → {fmtFecha(envio.periodo_hasta)}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{envio.total_facturas}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400 font-bold">{parseFloat(envio.total_importe).toFixed(2)}€</td>
                    <td className="px-4 py-3 text-slate-400">{envio.operador_nombre}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {envio.excel_url && <a href={envio.excel_url} target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400"><FileSpreadsheet size={16} /></a>}
                        <button type="button" onClick={() => abrirDocumento(envio.pdf_url)} className="text-blue-500 hover:text-blue-400"><FileText size={16} /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={envio.estado_envio === 'enviado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}>
                        {envio.estado_envio === 'enviado' ? 'OK' : 'Error'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
             </table>
          </div>
        )}
      </Card>
    </div>
  );
};


export default GestoriaPanel;
