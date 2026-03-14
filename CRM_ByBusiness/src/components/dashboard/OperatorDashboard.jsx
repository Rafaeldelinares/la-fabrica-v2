import React, { useState, useEffect } from 'react';
import { useAuth } from '../../modules/auth/AuthContext';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import EmptyState from '../../shared/ui/EmptyState';
import Stat from '../../shared/ui/Stat';
import { Database, ExternalLink, Copy, Phone, Calendar, GraduationCap, TrendingUp } from 'lucide-react';

const N8N = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

const OperatorDashboard = () => {
  const { user } = useAuth();
  const isTraining = user?.role === 'en_practicas';

  const [localidad, setLocalidad] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState('Todos');
  const [lead, setLead] = useState(null);
  const [llamadaId, setLlamadaId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [nombreResponsable, setNombreResponsable] = useState('');
  const [sessionLeads, setSessionLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('LLAMADA');
  const [elapsedString, setElapsedString] = useState('00:00');
  const [historial, setHistorial] = useState([]);
  const [programadas, setProgramadas] = useState([]);

  // Training-specific state
  const [sesionId, setSesionId] = useState(null);
  const [trainingLeads, setTrainingLeads] = useState([]);
  const [trainingStats, setTrainingStats] = useState(null);

  // Auto-iniciar sesión de entrenamiento
  useEffect(() => {
    if (!isTraining || !user?.id) return;
    fetch(`${N8N}/crm-iniciar-sesion-entrenamiento`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operador_id: user.id }),
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setSesionId(d.sesion.id); })
      .catch(() => {});
  }, [isTraining, user?.id]);

  // Cargar leads de entrenamiento
  useEffect(() => {
    if (!isTraining || !user?.id) return;
    fetch(`${N8N}/crm-leads-entrenamiento?operador_id=${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setTrainingLeads(d.leads); })
      .catch(() => {});
  }, [isTraining, user?.id, sessionLeads.length]);

  const handleAsignarLead = async () => {
    if (isTraining) {
      // Seleccionar lead ficticio con menos intentos
      const disponibles = trainingLeads.filter(l => !sessionLeads.find(s => s.id === l.id));
      if (!disponibles.length) return;
      const next = disponibles.sort((a, b) => (a.mis_intentos || 0) - (b.mis_intentos || 0))[0];
      setLead(next);
      setStartTime(Date.now());
      setResultado(''); setNotas(''); setActiveTab('LLAMADA');
      // Historial del lead ficticio
      setHistorial(next.mis_llamadas || []);
      return;
    }
    try {
      const resp = await fetch(`${N8N}/crm-llamada-activa?operador_id=${user?.id}`);
      const data = await resp.json();
      if (data && data.lead) {
        setLead(data.lead);
        setLlamadaId(data.llamada_id);
        setStartTime(Date.now());
        setResultado(''); setNotas(''); setFechaProgramada(''); setNombreResponsable('');
        setActiveTab('LLAMADA');
      }
    } catch {}
  };

  const handleRegistrarResultado = () => {
    if (!resultado) return;

    if (isTraining) {
      fetch(`${N8N}/crm-resultado-entrenamiento`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ficticio_id: lead.id,
          operador_id: user?.id,
          sesion_id: sesionId,
          resultado, notas,
          duracion_seg: Math.floor((Date.now() - startTime) / 1000),
        }),
      })
        .then(() => {
          setSessionLeads(prev => [...prev, { ...lead, resultado }]);
          setLead(null); setResultado(''); setNotas(''); setStartTime(null);
        })
        .catch(() => {});
      return;
    }

    const payload = {
      llamada_activa_id: llamadaId,
      operador_id: user?.id,
      lead_id: lead?.id,
      resultado, notas: notas || null,
      duracion_seg: Math.floor((Date.now() - startTime) / 1000),
      fecha_programada: fechaProgramada || null,
      nombre_responsable: nombreResponsable || null,
    };
    fetch(`${N8N}/crm-resultado`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(() => {
        setSessionLeads(prev => [...prev, { ...lead, resultado }]);
        setLead(null); setLlamadaId(null); setStartTime(null);
        setResultado(''); setNotas(''); setFechaProgramada(''); setNombreResponsable('');
      })
      .catch(() => {});
  };

  // Timer
  useEffect(() => {
    let interval;
    if (lead && startTime) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setElapsedString(`⏱ ${m}:${s}`);
      }, 1000);
    } else {
      setElapsedString('00:00');
    }
    return () => clearInterval(interval);
  }, [lead, startTime]);

  // Fetch programadas (solo operador real)
  useEffect(() => {
    if (isTraining || !user?.id) return;
    fetch(`${N8N}/crm-llamadas-programadas?operador_id=${user.id}`)
      .then(res => res.json())
      .then(data => { if (data?.ok) setProgramadas(data.programadas || []); })
      .catch(() => {});
  }, [user?.id, isTraining]);

  // Fetch historial lead real
  useEffect(() => {
    if (isTraining || !lead?.id) return;
    fetch(`${N8N}/crm-historial?lead_id=${lead.id}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setHistorial(data); else setHistorial([]); })
      .catch(() => setHistorial([]));
  }, [lead?.id, isTraining]);

  // Fetch stats entrenamiento para Zona 3
  useEffect(() => {
    if (!isTraining || !user?.id) return;
    fetch(`${N8N}/crm-historial-operador?operador_id=${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setTrainingStats(d.resumen); })
      .catch(() => {});
  }, [isTraining, user?.id, sessionLeads.length]);

  const opcionesResultado = [
    { id: 'venta',       label: 'VENTA' },
    { id: 'no_interesa', label: 'NO INTERESA' },
    { id: 'callback',    label: 'CALLBACK' },
    { id: 'responsable', label: 'RESPONSABLE' },
    { id: 'enviar_info', label: 'ENVIAR INFO' },
    { id: 'no_contesta', label: 'NO CONTESTA' },
    { id: 'error',       label: 'ERROR' },
  ];

  return (
    <div className="flex flex-row h-full gap-4 p-4 bg-slate-950 font-sans">

      {/* ════════════ ZONA 1 ════════════ */}
      <div className="w-72 flex flex-col gap-3">

        {isTraining ? (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-900/20 border border-amber-800/30 rounded-sm">
            <GraduationCap size={12} className="text-amber-400 shrink-0" />
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Modo simulación activa</span>
          </div>
        ) : (
          <>
            <input type="text" placeholder="Ciudad / Localidad" value={localidad}
              onChange={e => setLocalidad(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono" />
            <select value={tipoNegocio} onChange={e => setTipoNegocio(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase">
              <option value="Todos">Todos</option>
              <option value="Restaurante">Restaurante</option>
              <option value="Ferretería">Ferretería</option>
              <option value="Taller">Taller</option>
              <option value="Clínica">Clínica</option>
              <option value="Otro">Otro</option>
            </select>
          </>
        )}

        <Button variant="primary" className="w-full" onClick={handleAsignarLead}
          disabled={isTraining && trainingLeads.filter(l => !sessionLeads.find(s => s.id === l.id)).length === 0}>
          {isTraining ? 'SIGUIENTE CLIENTE' : 'ASIGNAR SIGUIENTE LEAD'}
        </Button>

        {isTraining && (
          <p className="text-[9px] text-slate-600 font-mono text-center">
            {trainingLeads.filter(l => !sessionLeads.find(s => s.id === l.id)).length} clientes disponibles
          </p>
        )}

        <div className="flex-1 overflow-y-auto mt-2 flex flex-col gap-2 relative">
          {sessionLeads.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <EmptyState title="Sin gestiones en esta sesión" icon={Database}
                description={isTraining ? 'Tus llamadas de práctica aparecerán aquí' : 'Tus tickets finalizados aparecerán aquí'} />
            </div>
          ) : (
            sessionLeads.map((item, index) => (
              <Card key={index} className="flex justify-between items-center !p-3 rounded-sm border-slate-800">
                <span className="text-xs text-slate-200 font-bold uppercase truncate pr-2 tracking-wider">{item.nombre_comercial}</span>
                <span className={`text-[9px] font-mono ${item.resultado === 'venta' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {item.resultado?.replace(/_/g, ' ')}
                </span>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* ════════════ ZONA 2 ════════════ */}
      <div className="flex-1 flex flex-row gap-4">
        <div className="flex-1 flex flex-col gap-4">

          <div className="flex border-b border-slate-800">
            {[['LLAMADA', 'LLAMADA ACTIVA'], ['REPUTACION', 'REPUTACIÓN'], ['GUION', 'GUIÓN']].map(([tabId, tabLabel]) => (
              <button key={tabId} onClick={() => setActiveTab(tabId)}
                className={`px-4 py-3 text-xs font-bold transition-all uppercase tracking-wider ${
                  activeTab === tabId ? 'bg-slate-800 text-white border-b-2 border-[#D00000]' : 'text-slate-500 hover:text-white'
                }`}>{tabLabel}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-1 flex flex-col relative">

            {activeTab === 'LLAMADA' && (
              !lead ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <EmptyState title={isTraining ? 'Pulsa "Siguiente cliente" para empezar' : 'Asigna un lead para empezar'}
                    icon={Phone} description={isTraining ? 'Se asignará un cliente ficticio para practicar' : 'Tu próxima gestión aparecerá aquí'} />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-white">{lead.nombre_comercial}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-3xl font-mono tracking-wider text-white">{lead.telefono}</span>
                      <button onClick={() => navigator.clipboard.writeText(lead.telefono || '')}
                        className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800 rounded-sm">
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-mono">
                      <span className="uppercase">{lead.localidad || lead.email || 'SIN LOCALIDAD'}</span>
                      <span>·</span>
                      <span className="uppercase">{lead.sector || lead.categoria || 'SIN CATEGORÍA'}</span>
                    </div>
                  </div>

                  {/* Perfil ficticio — solo en training */}
                  {isTraining && lead.perfil_cliente && (
                    <div className="bg-slate-950 border border-[#D00000]/30 rounded-sm p-3">
                      <p className="text-[9px] text-[#D00000] uppercase tracking-widest font-black mb-1">Perfil del cliente (solo tú lo ves)</p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{lead.perfil_cliente}</p>
                      {lead.objeciones_tipo && (
                        <div className="mt-2 pt-2 border-t border-slate-800">
                          <p className="text-[9px] text-amber-400 uppercase tracking-widest font-black mb-1">Objeciones típicas</p>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{lead.objeciones_tipo}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {!isTraining && (
                    <div className="border-l-2 border-[#D00000] bg-slate-900 p-4 text-xs text-slate-300 italic rounded-r-sm">
                      "Hola, buenos días, soy Rosa del equipo IA-ByBusiness. Llamo porque hemos detectado que su negocio {lead.nombre_comercial} en {lead.localidad} tiene margen de mejora en su reputación online. ¿Habla usted con el responsable del negocio?"
                    </div>
                  )}

                  <div className="text-sm font-mono text-slate-400">{elapsedString}</div>

                  <div className="mt-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Resolución de llamada</label>
                    <div className="grid grid-cols-3 gap-2">
                      {opcionesResultado.map(res => (
                        <button key={res.id} onClick={() => setResultado(res.id)}
                          className={`py-2 px-1 text-[10px] font-bold uppercase transition-all rounded-sm border ${
                            resultado === res.id
                              ? 'bg-[#D00000] text-white border-[#D00000]'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
                          }`}>{res.label}</button>
                      ))}
                    </div>
                  </div>

                  {!isTraining && resultado === 'callback' && (
                    <div className="mt-2 text-xs">
                      <label className="block text-slate-500 mb-1">PROGRAMAR EN (obligatorio)</label>
                      <input type="datetime-local" value={fechaProgramada}
                        onChange={e => setFechaProgramada(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white text-sm rounded-sm p-2 w-full outline-none focus:border-[#D00000]" />
                    </div>
                  )}

                  {!isTraining && resultado === 'venta' && (
                    <div className="mt-2 text-xs">
                      <label className="block text-slate-500 mb-1">NOMBRE RESPONSABLE (opcional)</label>
                      <input placeholder="Nombre del responsable" value={nombreResponsable}
                        onChange={e => setNombreResponsable(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white text-sm rounded-sm p-2 w-full outline-none focus:border-[#D00000]" />
                    </div>
                  )}

                  <div className="mt-2 flex-1 flex flex-col">
                    <textarea rows={3} placeholder="Notas adicionales (opcional)..."
                      className="bg-slate-900 border border-slate-700 text-white text-xs rounded-sm p-2 w-full outline-none focus:border-[#D00000] resize-none font-mono"
                      value={notas} onChange={e => setNotas(e.target.value)} />
                  </div>

                  <Button variant="primary" className="w-full mt-auto py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!resultado} onClick={handleRegistrarResultado}>
                    REGISTRAR RESULTADO
                  </Button>
                </div>
              )
            )}

            {activeTab === 'GUION' && (
              <div className="flex flex-col gap-3 py-2">
                {[
                  { fase: 'APERTURA', color: 'border-slate-600',
                    texto: `"Hola, mi nombre es ${user?.nombre || '[nombre]'} y le llamo de ByBusiness, especialistas en publicidad para Google. ¿Hablo con el responsable?"` },
                  { fase: 'CUALIFICACIÓN', color: 'border-slate-600',
                    texto: '"¿Cuál es su nombre para dirigirme a usted? — Encantado/a, [nombre]..."' },
                  { fase: 'GANCHO', color: 'border-amber-700',
                    texto: '"Le llamo porque estamos finalizando el año y como bien sabe, Google actualiza todas sus fichas de empresa para determinar cuáles califican para seguir apareciendo en primera página con búsqueda."' },
                  { fase: 'DIAGNÓSTICO', color: 'border-amber-700',
                    texto: `"Una vez verificada la ficha de su empresa, vemos que su valoración actual es de ${lead?.rating ? lead.rating + ' estrellas' : '_____ estrellas'} y en este caso es necesario generar un flujo de valoraciones positivas para conseguir la puntuación más alta, además de optimizar el perfil para ser vistos por más clientes."` },
                  { fase: 'OFERTA', color: 'border-[#D00000]',
                    texto: `"Esto sería a través de nuestras promociones vigentes que incluyen:\n• 3 formas de búsqueda diferentes y/o modificables\n• Fotografías de los servicios que ofrecen\n• Un publicista encargado de trabajar permanentemente en su ficha\n• Difusión en redes sociales\n• Geolocalización del local\n\nTodo por un ÚNICO pago de 289€ + IVA = 349,69€, para estar durante 18 MESES en la primera página de Google de forma fija y permanente (sin CPC)."` },
                  { fase: 'CIERRE', color: 'border-emerald-700',
                    texto: '"¿Tiene alguna pregunta o duda hasta aquí? — [responder y pasar al cierre]\n\nEn caso de que le interese quedarse con el espacio, le explico cómo trabajamos: por seguridad no pedimos ni número de cuenta ni de tarjeta. Lo que hacemos es un contrato mediante grabación de voz y le enviamos su factura proforma con todo detallado para el abono respectivo.\n\n¿A nombre de quién le enviamos la factura, al suyo o al de empresa?"' },
                ].map(({ fase, color, texto }) => (
                  <div key={fase} className={`border-l-2 ${color} bg-slate-900 rounded-r-sm px-4 py-3`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${
                      color.includes('D00000') ? 'text-[#D00000]' : color.includes('emerald') ? 'text-emerald-500' : color.includes('amber') ? 'text-amber-500' : 'text-slate-500'
                    }`}>{fase}</span>
                    <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{texto}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'REPUTACION' && (
              !lead ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <EmptyState title="Asigna un lead para empezar" icon={Phone} description="Consulta aquí métricas de reputación" />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <Stat className="flex-1" label="RATING" value={`${lead.rating || '-'}★`} />
                    <Stat className="flex-1" label="RESEÑAS" value={`${lead.num_reseñas || '-'}`} />
                    <Stat className="flex-1" label="SCORING" value={`${lead.scoring || '-'}`} />
                  </div>
                  {lead.google_maps_link && (
                    <a href={lead.google_maps_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-slate-900 w-fit px-3 py-2 rounded-sm border border-slate-800">
                      <ExternalLink width={14} height={14} /> Ver en Google Maps
                    </a>
                  )}
                  {isTraining && (
                    <div className="bg-amber-950/20 border border-amber-800/30 rounded-sm p-3">
                      <p className="text-[9px] text-amber-400 uppercase tracking-widest font-black mb-1">Datos simulados</p>
                      <p className="text-[10px] text-slate-400">En el entorno real verás los datos reales de reputación del cliente extraídos de Google.</p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA (HISTORIAL) */}
        <div className="w-80 flex flex-col gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1 pb-1 border-b border-slate-800">
            {isTraining ? 'MIS LLAMADAS A ESTE CLIENTE' : 'HISTORIAL'}
          </h3>
          <div className="flex-1 overflow-y-auto relative py-1 pr-1 flex flex-col gap-2">
            {!lead ? (
              <div className="absolute inset-0 flex items-center justify-center"><EmptyState title="Sin lead activo" /></div>
            ) : historial.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <EmptyState title="Primera vez con este cliente" />
              </div>
            ) : (
              historial.map((hist, idx) => (
                <Card key={idx} className="p-3 flex flex-col gap-1 border border-slate-800/50 bg-slate-900/40 rounded-sm">
                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                    <span>{hist.fecha ? new Date(hist.fecha).toLocaleDateString('es-ES') : 'Fecha N/A'}</span>
                    <span className="uppercase">{hist.resultado?.replace(/_/g, ' ') || 'N/A'}</span>
                  </div>
                  {hist.notas && <p className="text-xs text-slate-400 line-clamp-2 mt-1">{hist.notas}</p>}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ════════════ ZONA 3 ════════════ */}
      <div className="w-60 flex flex-col gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-sm">
        {isTraining ? (
          <>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
              <TrendingUp size={10} /> MI PROGRESO
            </h3>
            {trainingStats ? (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-sm p-3">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">Total sesiones</p>
                  <p className="text-xl font-black font-mono text-white">{trainingStats.total_sesiones ?? '—'}</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-sm p-3">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">Llamadas totales</p>
                  <p className="text-xl font-black font-mono text-white">{trainingStats.total_llamadas ?? '—'}</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-sm p-3">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">Ventas totales</p>
                  <p className="text-xl font-black font-mono text-emerald-400">{trainingStats.total_ventas ?? '—'}</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-sm p-3">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">Conversión</p>
                  <p className="text-xl font-black font-mono text-blue-400">{trainingStats.tasa_conversion ?? '—'}<span className="text-sm">%</span></p>
                </div>
                {(trainingStats.media_argumentacion || trainingStats.media_cierre) && (
                  <div className="bg-slate-950 border border-slate-800 rounded-sm p-3">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">Última evaluación</p>
                    <div className="flex flex-col gap-1 text-[10px] font-mono">
                      <span className="text-slate-400">Argum: <span className="text-white">{trainingStats.media_argumentacion ?? '—'}/10</span></span>
                      <span className="text-slate-400">Objec: <span className="text-white">{trainingStats.media_objeciones ?? '—'}/10</span></span>
                      <span className="text-slate-400">Cierre: <span className="text-white">{trainingStats.media_cierre ?? '—'}/10</span></span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-sm" />)}
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">PROGRAMADAS</h3>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 relative">
              {programadas.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <EmptyState title="Sin llamadas programadas" icon={Calendar} description="Tus callbacks aparecerán aquí" />
                </div>
              ) : (
                programadas.map(p => (
                  <Card key={p.id} className="p-3 flex flex-col gap-1 border-slate-800/50 rounded-sm">
                    <span className="text-xs font-bold text-white uppercase tracking-wider truncate">{p.nombre_comercial}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {p.fecha_programada ? new Date(p.fecha_programada).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                    <div><Badge status="pendiente">{p.tipo?.toUpperCase() || 'CALLBACK'}</Badge></div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default OperatorDashboard;
