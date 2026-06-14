import React, { useState, useEffect } from 'react';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import EmptyState from '../../shared/ui/EmptyState';
import { GraduationCap, RefreshCw, RotateCcw, UserCheck, Star, Trash2, Plus, ChevronDown, ChevronUp, AlertTriangle, TrendingDown, PhoneOff, TrendingUp } from 'lucide-react';
import { fmtHora } from '../../utils/dates';
import { n8nGet, n8nPost } from '../../shared/hooks/useN8n';

const ALERTAS_REGLAS = [
  {
    id: 'sin_actividad',
    check: (ll) => ll.length === 0,
    icon: PhoneOff,
    label: 'Sin actividad registrada',
    color: 'text-slate-400 bg-slate-800/50 border-slate-700',
  },
  {
    id: 'sin_ventas',
    check: (ll) => ll.length >= 3 && ll.filter(l => l.resultado === 'venta').length === 0,
    icon: TrendingDown,
    label: 'Sin ventas — reforzar cierre',
    color: 'text-red-400 bg-red-900/20 border-red-800/40',
  },
  {
    id: 'dificultad_contacto',
    check: (ll) => ll.length >= 3 && ll.filter(l => l.resultado === 'no_contesta').length / ll.length > 0.6,
    icon: AlertTriangle,
    label: 'Dificultad de contacto (>60% no contesta)',
    color: 'text-amber-400 bg-amber-900/20 border-amber-800/40',
  },
  {
    id: 'baja_conversion',
    check: (ll) => ll.length >= 5 && ll.filter(l => l.resultado === 'venta').length / ll.length < 0.15,
    icon: TrendingDown,
    label: 'Conversión < 15% — revisar argumentación',
    color: 'text-orange-400 bg-orange-900/20 border-orange-800/40',
  },
  {
    id: 'buena_conversion',
    check: (ll) => ll.length >= 3 && ll.filter(l => l.resultado === 'venta').length / ll.length >= 0.4,
    icon: TrendingUp,
    label: 'Excelente conversión ≥ 40%',
    color: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/40',
  },
];

const AlertasSesion = ({ llamadas }) => {
  const activas = ALERTAS_REGLAS.filter(r => r.check(llamadas));
  if (!activas.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {activas.map(a => {
        const Icon = a.icon;
        return (
          <span key={a.id} className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border ${a.color}`}>
            <Icon size={9} /> {a.label}
          </span>
        );
      })}
    </div>
  );
};

const DIFICULTAD_COLOR = {
  facil:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medio:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  dificil: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const PuntuacionInput = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</span>
    <div className="flex gap-1">
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button key={n} onClick={() => onChange(n)}
          className={`w-6 h-6 text-[9px] font-black rounded-sm transition-colors ${
            value >= n ? 'bg-[#D00000] text-white' : 'bg-slate-800 text-slate-600 hover:text-white'
          }`}>{n}</button>
      ))}
    </div>
  </div>
);

const TarjetaOperador = ({ op, onEvaluar }) => {
  const [open, setOpen] = useState(false);
  const [punt, setPunt] = useState({ argumentacion: 0, objeciones: 0, cierre: 0 });
  const [comentarios, setComentarios] = useState('');
  const [apto, setApto] = useState(null);
  const [saving, setSaving] = useState(false);

  const evaluar = async () => {
    if (!op.sesion_id || apto === null) return;
    setSaving(true);
    try {
      await n8nPost('crm-evaluar-sesion', {
        sesion_id: op.sesion_id,
        supervisor_id: onEvaluar.supervisorId,
        punt_argumentacion: punt.argumentacion,
        punt_objeciones: punt.objeciones,
        punt_cierre: punt.cierre,
        comentarios, apto,
      });
      onEvaluar.refetch();
    } catch (err) {
      // Mostrar error al supervisor en vez de swallow
      if (import.meta.env.DEV) console.error('[SupervisorPanel] Error al guardar evaluación:', err);
    } finally {
      setSaving(false);
    }
  };

  const llamadas = op.ultimas_llamadas || [];
  const ventas = llamadas.filter(l => l.resultado === 'venta').length;
  const media = punt.argumentacion && punt.objeciones && punt.cierre
    ? ((punt.argumentacion + punt.objeciones + punt.cierre) / 3).toFixed(1)
    : null;

  return (
    <Card className="border-slate-800 bg-slate-900 p-0 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#D00000]/10 border border-[#D00000]/20 flex items-center justify-center">
            <GraduationCap size={14} className="text-[#D00000]" />
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase tracking-wide">{op.nombre}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{op.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {op.sesion_id ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400">Sesión activa</span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-slate-600">Sin sesión activa</span>
          )}
          <div className="text-right">
            <p className="text-[10px] text-slate-600">Llamadas</p>
            <p className="text-xs font-mono font-bold text-white">{op.llamadas_sesion || 0}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600">Ventas</p>
            <p className="text-xs font-mono font-bold text-emerald-400">{ventas}</p>
          </div>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 p-4 space-y-4">

          {/* Últimas llamadas */}
          {llamadas.length > 0 && (
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">Actividad de la sesión</p>
              <div className="space-y-1">
                {llamadas.map((ll, i) => (
                  <div key={i} className="flex items-center gap-3 text-[10px] py-1.5 border-b border-slate-800/50 last:border-0">
                    <span className="font-mono text-slate-600 w-20 shrink-0">{fmtHora(ll.fecha)}</span>
                    <span className="font-bold text-slate-300 truncate flex-1">{ll.lead}</span>
                    <span className={`font-mono shrink-0 ${ll.resultado === 'venta' ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {ll.resultado?.replace(/_/g,' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alertas automáticas por reglas */}
          <AlertasSesion llamadas={llamadas} />

          {/* Evaluación */}
          {op.sesion_id && (
            <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-sm p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">Evaluar sesión</p>
              <PuntuacionInput label="Argumentación" value={punt.argumentacion} onChange={v => setPunt(p => ({...p, argumentacion: v}))} />
              <PuntuacionInput label="Manejo de objeciones" value={punt.objeciones} onChange={v => setPunt(p => ({...p, objeciones: v}))} />
              <PuntuacionInput label="Cierre" value={punt.cierre} onChange={v => setPunt(p => ({...p, cierre: v}))} />
              {media && (
                <p className="text-[10px] font-mono text-white">Media: <span className="text-[#D00000] font-black">{media}/10</span></p>
              )}
              <textarea value={comentarios} onChange={e => setComentarios(e.target.value)}
                placeholder="Comentarios para el operador..."
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-2 py-1.5 outline-none font-mono resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setApto(true)}
                  className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-sm border transition-colors uppercase tracking-widest ${
                    apto === true ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-emerald-400 hover:border-emerald-700'
                  }`}>
                  <UserCheck size={10} /> Apto → Operador real
                </button>
                <button onClick={() => setApto(false)}
                  className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-sm border transition-colors uppercase tracking-widest ${
                    apto === false ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}>
                  Necesita más práctica
                </button>
              </div>
              <button onClick={evaluar} disabled={apto === null || saving}
                className="flex items-center gap-1.5 text-[10px] font-black text-white bg-[#D00000] hover:bg-red-700 px-4 py-1.5 rounded-sm transition-colors disabled:opacity-50 uppercase tracking-widest">
                <Star size={10} /> {saving ? 'Guardando…' : 'Guardar evaluación'}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const GestionLeads = ({ onRefresh }) => {
  const [leads, setLeads] = useState(null);
  const [resetting, setResetting] = useState(false);

  const cargar = () => {
    n8nGet('crm-leads-entrenamiento')
      .then(d => { if (d.ok) setLeads(d.leads); })
      .catch(() => setLeads([]));
  };

  useEffect(() => {
    cargar();
  }, []);

  const resetAll = async () => {
    if (!confirm('¿Borrar TODAS las interacciones de entrenamiento? Los leads quedarán limpios.')) return;
    setResetting(true);
    try {
      await n8nPost('crm-reset-entrenamiento', { accion: 'reset_historial' });
      cargar(); onRefresh();
    } finally { setResetting(false); }
  };

  const toggleLead = async (lead) => {
    try {
      await n8nPost('crm-reset-entrenamiento', { accion: lead.activo ? 'borrar_lead' : 'restaurar_lead', lead_id: lead.id });
      cargar();
    } catch { /* error de red */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Gestión de leads ficticios</p>
        <button onClick={resetAll} disabled={resetting}
          className="flex items-center gap-1.5 text-[10px] font-black text-red-400 hover:text-white border border-red-900/50 hover:border-red-600 px-3 py-1.5 rounded-sm transition-colors uppercase tracking-widest disabled:opacity-50">
          <RotateCcw size={10} /> {resetting ? 'Reseteando…' : 'Reset total'}
        </button>
      </div>

      {leads === null ? (
        <div className="animate-pulse h-10 bg-slate-800 rounded-sm" />
      ) : (
        <div className="space-y-1">
          {leads.map(lead => (
            <div key={lead.id} className={`flex items-center justify-between px-3 py-2 rounded-sm border transition-colors ${
              lead.activo ? 'bg-slate-900 border-slate-800' : 'bg-slate-950 border-slate-800/50 opacity-50'
            }`}>
              <div className="flex items-center gap-2">
                <Badge className={DIFICULTAD_COLOR[lead.nivel_dificultad]}>{lead.nivel_dificultad}</Badge>
                <span className="text-[11px] text-slate-300">{lead.nombre_comercial}</span>
                {lead.mis_intentos > 0 && (
                  <span className="text-[10px] text-blue-400 font-mono">{lead.mis_intentos} llam.</span>
                )}
              </div>
              <button onClick={() => toggleLead(lead)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border transition-colors ${
                  lead.activo
                    ? 'text-slate-500 hover:text-red-400 border-slate-700 hover:border-red-800'
                    : 'text-emerald-400 hover:text-white border-emerald-800 hover:border-emerald-600'
                }`}>
                {lead.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SupervisorPanel = ({ user }) => {
  const [operadores, setOperadores] = useState(null);
  const [tab, setTab] = useState('operadores');

  const cargar = () => {
    setOperadores(null);
    n8nGet('crm-panel-supervisor')
      .then(d => { if (d.ok) setOperadores(d.operadores); })
      .catch(() => setOperadores([]));
  };

  useEffect(() => {
    Promise.resolve().then(() => cargar());
  }, []);

  const activos = operadores?.filter(o => o.sesion_id) || [];

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">PANEL SUPERVISOR</h2>
          {operadores !== null && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-sm border border-slate-700">
              {activos.length} activo{activos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[{id:'operadores',label:'Operadores'},{id:'leads',label:'Leads'}].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
                  tab === t.id ? 'bg-[#D00000]/10 text-[#D00000] border-[#D00000]/30' : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}>{t.label}</button>
            ))}
          </div>
          <button onClick={cargar}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
            <RefreshCw size={11} /> Actualizar
          </button>
        </div>
      </div>

      {tab === 'operadores' && (
        <>
          {operadores === null ? (
            <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
              <div className="flex flex-col gap-3 items-center">
                <div className="h-4 w-48 bg-slate-800 rounded-sm" />
                <div className="h-3 w-32 bg-slate-800 rounded-sm" />
              </div>
            </div>
          ) : operadores.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <EmptyState title="Sin operadores en prácticas" icon={GraduationCap}
                description="Los operadores con rol 'en_practicas' aparecerán aquí" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {operadores.map(op => (
                <TarjetaOperador key={op.id} op={op}
                  onEvaluar={{ supervisorId: user.id, refetch: cargar }} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'leads' && (
        <Card className="bg-slate-900 border-slate-800 p-4">
          <GestionLeads onRefresh={cargar} />
        </Card>
      )}
    </div>
  );
};

export default SupervisorPanel;
