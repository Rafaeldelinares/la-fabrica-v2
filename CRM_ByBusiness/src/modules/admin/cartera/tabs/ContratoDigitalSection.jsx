import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Send, Plus, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

const ESTADO_BADGE = {
  borrador:             'bg-slate-700/60 text-slate-400 border-slate-600',
  enviado:              'bg-blue-900/40 text-blue-300 border-blue-800',
  aceptado:             'bg-emerald-900/40 text-emerald-300 border-emerald-800',
  rechazado:            'bg-red-900/40 text-red-400 border-red-800',
  respuesta_irregular:  'bg-amber-900/40 text-amber-300 border-amber-700',
  vencido:              'bg-slate-800 text-slate-500 border-slate-700',
};

const ESTADO_ICON = {
  borrador:            <Clock size={10} />,
  enviado:             <Send size={10} />,
  aceptado:            <CheckCircle size={10} />,
  rechazado:           <XCircle size={10} />,
  respuesta_irregular: <AlertTriangle size={10} />,
  vencido:             <XCircle size={10} />,
};

const CANALES = ['whatsapp', 'email', 'ambos'];

/**
 * ContratoDigitalSection — muestra y gestiona contratos digitales del cliente.
 * Permite crear (borrador), enviar por WhatsApp/email y ver el estado de aceptación.
 * @param {{ cliente: object, n8nUrl: string }} props
 */
const ContratoDigitalSection = ({ cliente, n8nUrl }) => {
  const [contratos, setContratos] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [busy,      setBusy]      = useState(null);
  const [form, setForm] = useState({ objeto: '', importe_mensual: '', canal_envio: 'whatsapp' });

  const cargar = useCallback(() => {
    setLoading(true); setError(null);
    fetch(`${n8nUrl}/crm-contratos-digitales?cliente_id=${cliente.id}`)
      .then(r => r.json())
      .then(d => { setContratos(d.contratos || []); setLoading(false); })
      .catch(err => { if (import.meta.env.DEV) console.error('[ContratoDigitalSection] cargar:', err); setError('Error al cargar contratos digitales'); setLoading(false); });
  }, [cliente.id, n8nUrl]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCrear = async () => {
    if (!form.objeto.trim()) return;
    setBusy('crear');
    try {
      const r = await fetch(`${n8nUrl}/crm-70-post-contrato-digital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id:      cliente.id,
          objeto:          form.objeto.trim(),
          importe_mensual: parseFloat(form.importe_mensual) || null,
          canal_envio:     form.canal_envio,
          contrato_id:     cliente.contrato_activo_id || undefined,
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setShowForm(false);
        setForm({ objeto: '', importe_mensual: '', canal_envio: 'whatsapp' });
        cargar();
      } else { setError('Error al crear contrato digital'); }
    } catch (err) { if (import.meta.env.DEV) console.error('[ContratoDigitalSection]:', err); setError('Error de conexión'); }
    finally { setBusy(null); }
  };

  const handleEnviar = async (contrato) => {
    setBusy(`enviar-${contrato.id}`);
    setError(null);
    try {
      const r = await fetch(`${n8nUrl}/crm-72-post-contrato-enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrato_id: contrato.id }),
      });
      const d = await r.json();
      if (d.ok) cargar();
      else setError('Error al enviar contrato');
    } catch (err) { if (import.meta.env.DEV) console.error('[ContratoDigitalSection]:', err); setError('Error de conexión'); }
    finally { setBusy(null); }
  };

  if (loading) return (
    <div className="px-5 py-4 flex flex-col gap-2">
      {[1, 2].map(i => <div key={i} className="h-14 bg-slate-800/40 rounded-sm animate-pulse" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Contratos Digitales</p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest border border-[#D00000]/40 hover:border-[#D00000] text-[#D00000] rounded-sm px-2.5 py-1 transition-colors"
          >
            <Plus size={9} /> Nuevo
          </button>
        )}
      </div>

      {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}

      {contratos.length === 0 && !showForm && (
        <div className="border border-dashed border-slate-800 rounded-sm p-5 text-center">
          <p className="text-slate-600 text-xs font-mono">Sin contratos digitales</p>
        </div>
      )}

      {contratos.map(cd => (
        <div key={cd.id} className="border border-slate-800 rounded-sm bg-slate-900/40 px-4 py-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-300 tracking-wider">{cd.referencia}</span>
            <span className={`flex items-center gap-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded-sm border ${ESTADO_BADGE[cd.estado] || ESTADO_BADGE.borrador}`}>
              {ESTADO_ICON[cd.estado]} {cd.estado}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-snug line-clamp-2">{cd.objeto}</p>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-600 font-mono">
              {cd.canal_envio && `Canal: ${cd.canal_envio}`}
              {cd.importe_mensual && ` · ${Number(cd.importe_mensual).toFixed(0)}€/mes`}
            </span>
            {cd.estado === 'borrador' && (
              <button
                disabled={busy === `enviar-${cd.id}`}
                onClick={() => handleEnviar(cd)}
                className="flex items-center gap-1 text-[9px] font-mono uppercase border border-blue-800 rounded-sm px-2.5 py-1 text-blue-400 hover:bg-blue-900/20 disabled:opacity-40 transition-colors"
              >
                <Send size={9} /> {busy === `enviar-${cd.id}` ? 'Enviando…' : 'Enviar'}
              </button>
            )}
          </div>
          {cd.respuesta_raw && (
            <p className="text-[9px] text-amber-400/80 font-mono border-t border-slate-800 pt-1.5 mt-0.5">
              Respuesta: {cd.respuesta_raw}
            </p>
          )}
        </div>
      ))}

      {showForm && (
        <div className="border border-slate-700 rounded-sm p-4 bg-slate-900/50 flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Nuevo contrato digital</p>
          <textarea
            rows={3}
            placeholder="Objeto del contrato (ej: Gestión integral de reputación digital…)"
            value={form.objeto}
            onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))}
            className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] text-slate-600 font-mono mb-1">€/mes (opcional)</p>
              <input type="number" placeholder="0.00" value={form.importe_mensual}
                onChange={e => setForm(f => ({ ...f, importe_mensual: e.target.value }))}
                className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full" />
            </div>
            <div>
              <p className="text-[9px] text-slate-600 font-mono mb-1">Canal de envío</p>
              <select value={form.canal_envio}
                onChange={e => setForm(f => ({ ...f, canal_envio: e.target.value }))}
                className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full">
                {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={handleCrear}
              disabled={busy === 'crear' || !form.objeto.trim()}
              className="flex-1 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-slate-600 rounded-sm text-slate-300 hover:text-white transition-colors disabled:opacity-40">
              {busy === 'crear' ? 'Generando…' : 'Generar borrador'}
            </button>
            <button onClick={() => { setShowForm(false); setError(null); }}
              className="px-3 py-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

ContratoDigitalSection.propTypes = {
  cliente: PropTypes.shape({ id: PropTypes.number.isRequired }).isRequired,
  n8nUrl:  PropTypes.string.isRequired,
};

export default ContratoDigitalSection;
