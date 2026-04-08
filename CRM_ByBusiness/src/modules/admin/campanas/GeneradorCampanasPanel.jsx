import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import { RefreshCw, Plus, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * GeneradorCampanasPanel — Panel de generación automática de campañas desde leads huérfanos.
 * @param {string} modoInicial — 'reales' o 'entrenamiento'
 * @param {Function} onCerrar — Callback al cerrar el modal
 */
const GeneradorCampanasPanel = ({ modoInicial = 'reales', onCerrar }) => {
  const N8N = import.meta.env.VITE_N8N_URL;
  const [modo, setModo] = useState(modoInicial);
  const [analizando, setAnalizando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState({});
  const [mensaje, setMensaje] = useState('');
  const msgTimerRef = useRef(null);

  useEffect(() => () => { if (msgTimerRef.current) clearTimeout(msgTimerRef.current); }, []);

  const mostrarMensaje = (msg) => {
    setMensaje(msg);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMensaje(''), 3000);
  };

  const analizar = useCallback(async () => {
    setAnalizando(true);
    setError('');
    try {
      const res = await fetch(`${N8N}/crm-analisis-campanas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ es_simulacion: modo === 'entrenamiento' })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok) setResultado(data);
      else setError('Error en el análisis');
    } catch {
      setError('Error de conexión');
    } finally {
      setAnalizando(false);
    }
  }, [N8N, modo]);

  const crearCampana = async (propuesta) => {
    setCreando(prev => ({ ...prev, [propuesta.id]: true }));
    try {
      const res = await fetch(`${N8N}/crm-campana-crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: propuesta.nombre,
          descripcion: propuesta.descripcion,
          leads_ids: propuesta.leads_ids,
          es_simulacion: modo === 'entrenamiento',
          prioridad: 1
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok) {
        mostrarMensaje(`Campaña "${data.campana.nombre}" creada con ${data.leads_asignados} leads`);
        analizar();
      }
    } catch {
      setError('Error al crear campaña');
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      msgTimerRef.current = setTimeout(() => setError(''), 3000);
    } finally {
      setCreando(prev => ({ ...prev, [propuesta.id]: false }));
    }
  };

  const selectCls = "bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase";
  const btnCls = "px-4 py-2 rounded-sm bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-6 bg-slate-950 font-sans">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-widest">🤖 GENERADOR DE CAMPAÑAS</h2>
                {onCerrar && (
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white text-xs font-mono">✕ CERRAR</button>
                )}
                <div className="flex gap-2">
          <button onClick={() => setModo('reales')} className={`${btnCls} ${modo === 'reales' ? 'bg-[#D00000] text-white' : ''}`}>🌍 REALES</button>
          <button onClick={() => setModo('entrenamiento')} className={`${btnCls} ${modo === 'entrenamiento' ? 'bg-amber-600 text-white' : ''}`}>🎓 ENTRENAMIENTO</button>
        </div>
      </div>

      {error && <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">{error}</div>}
      {mensaje && <div className="px-3 py-2 bg-emerald-900/20 border border-emerald-900/30 rounded-sm text-[10px] text-emerald-400 font-mono">{mensaje}</div>}

      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-slate-400 font-mono">
            Modo: <span className="text-white font-bold">{modo === 'reales' ? 'REALES' : 'ENTRENAMIENTO'}</span>
          </p>
          <button onClick={analizar} disabled={analizando} className={`${btnCls} flex items-center gap-2`}>
            {analizando ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {analizando ? 'ANALIZANDO...' : 'ANALIZAR LEADS'}
          </button>
        </div>

        {resultado && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-sm p-3 text-center">
                <div className="text-2xl font-black text-white">{resultado.resumen.campanas_existentes}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Campañas Activas</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-sm p-3 text-center">
                <div className="text-2xl font-black text-yellow-400">{resultado.resumen.leads_huerfanos}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Leads Huérfanos</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-sm p-3 text-center">
                <div className="text-2xl font-black text-blue-400">{resultado.resumen.propuestas_generadas}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Propuestas</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-sm p-3 text-center">
                <div className="text-2xl font-black text-emerald-400">{resultado.resumen.propuestas_validas}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Válidas</div>
              </div>
            </div>

            {resultado.campanas_existentes?.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">📌 CAMPANAS EXISTENTES</h3>
                <div className="grid grid-cols-3 gap-2">
                  {resultado.campanas_existentes.map(campana => (
                    <div key={campana.id} className="bg-slate-950 border border-slate-800 rounded-sm p-2">
                      <div className="text-xs font-bold text-slate-200 truncate">{campana.nombre}</div>
                      <div className="text-[9px] text-slate-500 font-mono">{campana.leads_asignados} leads</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.propuestas?.length > 0 ? (
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">💡 PROPUESTAS DE CAMPAÑAS</h3>
                <div className="space-y-2">
                  {resultado.propuestas.map(prop => (
                    <div key={prop.id} className={`border rounded-sm p-3 ${prop.valida ? 'bg-emerald-950/10 border-emerald-900/30' : prop.conflictos.length > 0 ? 'bg-amber-950/10 border-amber-900/30' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-bold text-slate-200">{prop.nombre}</div>
                          <div className="text-[10px] text-slate-400">{prop.descripcion}</div>
                        </div>
                        <Badge className={prop.valida ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : prop.conflictos.length > 0 ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 'bg-slate-800 text-slate-400'}>
                          {prop.leads_count} leads
                        </Badge>
                      </div>

                      <div className="flex gap-2 text-[9px] font-mono text-slate-500 mb-2">
                        <span>🔥 {prop.distribucion_prioridad.alta}</span>
                        <span>⚡ {prop.distribucion_prioridad.normal}</span>
                        <span>💤 {prop.distribucion_prioridad.baja}</span>
                      </div>

                      {prop.conflictos.length > 0 && (
                        <div className="flex items-center gap-2 text-[9px] text-amber-400 mb-2">
                          <AlertTriangle size={10} />
                          <span>{prop.conflictos[0].mensaje}</span>
                        </div>
                      )}

                      {prop.valida && (
                        <button
                          onClick={() => crearCampana(prop)}
                          disabled={creando[prop.id]}
                          className="w-full py-2 rounded-sm bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-900/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {creando[prop.id] ? <RefreshCw size={10} className="animate-spin" /> : <Plus size={10} />}
                          {creando[prop.id] ? 'CREANDO...' : 'CREAR CAMPAÑA'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : resultado ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <CheckCircle size={24} className="mx-auto mb-2 text-emerald-500" />
                <p>Todos los leads están cubiertos por campañas existentes</p>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
};

GeneradorCampanasPanel.propTypes = {
  modoInicial: PropTypes.string,
  onCerrar: PropTypes.func
};

export default GeneradorCampanasPanel;
