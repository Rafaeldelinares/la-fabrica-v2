import React, { useState, useEffect } from 'react';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import EmptyState from '../../shared/ui/EmptyState';
import HistorialProgreso from './HistorialProgreso';
import { GraduationCap, Phone, PhoneOff, PhoneMissed, Calendar, TrendingUp, RefreshCw, Play, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { fmtFecha } from '../../utils/dates';
import { n8nGet, n8nPost } from '../../shared/hooks/useN8n';

const DIFICULTAD_COLOR = {
  facil:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medio:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  dificil: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const RESULTADO_OPTS = [
  { value: 'venta',       label: '✅ Venta',         color: 'text-emerald-400' },
  { value: 'callback',    label: '📅 Callback',       color: 'text-blue-400' },
  { value: 'no_contesta', label: '📵 No contesta',    color: 'text-slate-400' },
  { value: 'no_interesa', label: '🚫 No interesa',    color: 'text-red-400' },
  { value: 'ocupado',     label: '⏳ Ocupado',        color: 'text-amber-400' },
];

const TarjetaLead = ({ lead, onRegistrar }) => {
  const [open, setOpen] = useState(false);
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');
  const [duracion, setDuracion] = useState('');
  const [saving, setSaving] = useState(false);

  const registrar = async () => {
    if (!resultado) return;
    setSaving(true);
    try {
      await n8nPost('crm-resultado-entrenamiento', {
        lead_ficticio_id: lead.id,
        operador_id: onRegistrar.operadorId,
        sesion_id: onRegistrar.sesionId,
        resultado, notas,
        duracion_seg: duracion ? parseInt(duracion) : null,
      });
      setResultado(''); setNotas(''); setDuracion(''); setOpen(false);
      onRegistrar.refetch();
    } catch { /* error de red — finally restablece el estado */ }
    finally { setSaving(false); }
  };

  return (
    <Card className="border-slate-800 bg-slate-900 p-0 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between p-4 hover:bg-slate-800/30 transition-colors text-left gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={DIFICULTAD_COLOR[lead.nivel_dificultad]}>
              {lead.nivel_dificultad.toUpperCase()}
            </Badge>
            <span className="text-xs font-black text-white uppercase tracking-wide truncate">
              {lead.nombre_comercial}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">{lead.sector} · {lead.localidad}</p>
          {lead.mis_intentos > 0 && (
            <p className="text-[10px] text-blue-400 font-mono mt-1">{lead.mis_intentos} llamada{lead.mis_intentos > 1 ? 's' : ''} realizadas</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-slate-600">{lead.telefono}</span>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 p-4 space-y-3">
          {/* Perfil del cliente */}
          <div className="bg-slate-950 border border-slate-700 rounded-sm p-3">
            <p className="text-[9px] text-[#D00000] uppercase tracking-widest font-black mb-1">Perfil del cliente (visible para el evaluador)</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">{lead.perfil_cliente}</p>
          </div>
          {lead.objeciones_tipo && (
            <div className="bg-amber-950/20 border border-amber-800/30 rounded-sm p-3">
              <p className="text-[9px] text-amber-400 uppercase tracking-widest font-black mb-1">Objeciones típicas</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{lead.objeciones_tipo}</p>
            </div>
          )}

          {/* Historial previo de este lead */}
          {lead.mis_llamadas?.length > 0 && (
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">Mis llamadas anteriores</p>
              {lead.mis_llamadas.map((ll, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] py-1 border-b border-slate-800/50 last:border-0">
                  <span className="font-mono text-slate-600">{fmtFecha(ll.fecha)}</span>
                  <span className="text-slate-400">{ll.resultado?.replace(/_/g,' ')}</span>
                  {ll.notas && <span className="text-slate-600 italic truncate flex-1">{ll.notas}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Registrar llamada */}
          <div className="space-y-2 pt-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Registrar llamada</p>
            <div className="flex flex-wrap gap-2">
              {RESULTADO_OPTS.map(opt => (
                <button key={opt.value}
                  onClick={() => setResultado(opt.value)}
                  className={`text-[10px] px-2 py-1 rounded-sm border transition-colors font-mono ${
                    resultado === opt.value
                      ? 'bg-[#D00000]/20 border-[#D00000]/50 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={duracion} onChange={e => setDuracion(e.target.value)}
                placeholder="Duración (seg)"
                className="w-28 bg-slate-800 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-2 py-1.5 outline-none font-mono" />
              <input value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Notas de la llamada..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-2 py-1.5 outline-none font-mono" />
            </div>
            <button onClick={registrar} disabled={!resultado || saving}
              className="flex items-center gap-1.5 text-[10px] font-black text-white bg-[#D00000] hover:bg-red-700 px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50 uppercase tracking-widest">
              <Phone size={10} /> {saving ? 'Guardando…' : 'Registrar resultado'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

const EntrenamientoPanel = ({ user }) => {
  const [tab, setTab] = useState('PRACTICA');
  const [leads, setLeads] = useState(null);
  const [sesionId, setSesionId] = useState(null);
  const [iniciando, setIniciando] = useState(false);

  const cargarLeads = () => {
    n8nGet('crm-leads-entrenamiento', { operador_id: user.id })
      .then(d => { if (d.ok) setLeads(d.leads); })
      .catch(() => setLeads([]));
  };

  const iniciarSesion = async () => {
    setIniciando(true);
    try {
      const d = await n8nPost('crm-iniciar-sesion-entrenamiento', { operador_id: user.id });
      if (d.ok) { setSesionId(d.sesion.id); cargarLeads(); }
    } finally { setIniciando(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarLeads(); }, []);

  const totalLlamadas = leads ? leads.reduce((s, l) => s + (l.mis_intentos || 0), 0) : 0;
  const totalVentas = leads ? leads.reduce((s, l) => s + (l.mis_llamadas?.filter(ll => ll.resultado === 'venta').length || 0), 0) : 0;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-[#D00000]" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">MODO ENTRENAMIENTO</h2>
          </div>
          <div className="flex gap-1">
            {[['PRACTICA', 'Práctica'], ['HISTORIAL', 'Mi Progreso']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-sm border transition-colors ${
                  tab === id ? 'bg-[#D00000]/10 text-[#D00000] border-[#D00000]/30' : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}>{label}</button>
            ))}
          </div>
          {tab === 'PRACTICA' && (
          <span className="text-[10px] font-mono text-amber-400 bg-amber-900/20 border border-amber-800/30 px-2 py-0.5 rounded-sm animate-pulse">
            SIMULACIÓN ACTIVA
          </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalLlamadas > 0 && (
            <>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-sm border border-slate-700">{totalLlamadas} llamadas</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded-sm border border-emerald-800/30">{totalVentas} ventas</span>
            </>
          )}
          <button onClick={cargarLeads}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
            <RefreshCw size={11} /> Actualizar
          </button>
        </div>
      </div>

      {tab === 'PRACTICA' && (
        <>
          {/* Iniciar sesión */}
          {!sesionId && (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Iniciar sesión de entrenamiento</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Registra tus llamadas y progreso en esta sesión</p>
              </div>
              <button onClick={iniciarSesion} disabled={iniciando}
                className="flex items-center gap-1.5 text-[10px] font-black text-white bg-[#D00000] hover:bg-red-700 px-4 py-2 rounded-sm transition-colors disabled:opacity-50 uppercase tracking-widest">
                <Play size={10} /> {iniciando ? 'Iniciando…' : 'Iniciar sesión'}
              </button>
            </div>
          )}

          {sesionId && (
            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-sm px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400">Sesión #{sesionId} en curso</span>
            </div>
          )}

          {/* Instrucciones */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-sm p-3">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              <span className="text-white font-bold">Cómo funciona:</span> Elige un cliente de la lista, llama al número de tu supervisor (que simulará ser ese cliente siguiendo el perfil), practica tu guión y registra el resultado. Puedes llamar a varios clientes en la misma sesión.
            </p>
          </div>

          {/* Lista de leads */}
          {leads === null ? (
            <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
              <div className="flex flex-col gap-3 items-center">
                <div className="h-4 w-48 bg-slate-800 rounded-sm" />
                <div className="h-3 w-32 bg-slate-800 rounded-sm" />
              </div>
            </div>
          ) : (
            <>
              {['facil', 'medio', 'dificil'].map(nivel => {
                const grupo = leads.filter(l => l.nivel_dificultad === nivel);
                if (!grupo.length) return null;
                const labels = { facil: 'FÁCIL', medio: 'MEDIO', dificil: 'DIFÍCIL' };
                return (
                  <div key={nivel}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{labels[nivel]}</span>
                      <span className="text-[10px] font-mono text-slate-700 bg-slate-800 px-2 py-0.5 rounded-sm">{grupo.length}</span>
                      <div className="flex-1 h-px bg-slate-800" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {grupo.map(lead => (
                        <TarjetaLead key={lead.id} lead={lead}
                          onRegistrar={{ operadorId: user.id, sesionId, refetch: cargarLeads }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}

      {tab === 'HISTORIAL' && <HistorialProgreso user={user} />}
    </div>
  );
};

export default EntrenamientoPanel;
