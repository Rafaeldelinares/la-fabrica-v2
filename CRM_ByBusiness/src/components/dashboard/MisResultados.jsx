import React, { useState, useEffect } from 'react';
import { useAuth } from '../../modules/auth/AuthContext';
import Stat from '../../shared/ui/Stat';
import Card from '../../shared/ui/Card';
import EmptyState from '../../shared/ui/EmptyState';
import { BarChart2, TrendingUp, Phone, Clock } from 'lucide-react';
import { n8nGet } from '../../shared/hooks/useN8n';

const RESULTADOS = [
  { key: 'ventas_hoy',       label: 'VENTAS',       color: 'text-emerald-400' },
  { key: 'callbacks_hoy',    label: 'CALLBACKS',    color: 'text-amber-400'   },
  { key: 'no_contesta_hoy',  label: 'NO CONTESTA',  color: 'text-slate-400'   },
  { key: 'no_interesa_hoy',  label: 'NO INTERESA',  color: 'text-slate-500'   },
  { key: 'enviar_info_hoy',  label: 'ENVIAR INFO',  color: 'text-blue-400'    },
  { key: 'responsable_hoy',  label: 'RESPONSABLE',  color: 'text-purple-400'  },
];

const MisResultados = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    n8nGet('crm-resultados-operador', { operador_id: user.id })
      .then(data => { if (data?.ok) setStats(data.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const fmtSeg = (seg) => {
    if (!seg) return '0s';
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded-sm" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-800 rounded-sm" />)}
        </div>
        <div className="h-48 bg-slate-800 rounded-sm" />
      </div>
    );
  }

  if (!stats) {
    return <EmptyState title="Sin datos disponibles" icon={BarChart2} description="No se pudieron cargar tus resultados" />;
  }

  return (
    <div className="flex flex-col gap-6 h-full">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Mis Resultados</h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            {user?.nombre || 'Operador'} · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="LLAMADAS HOY"    value={stats.llamadas_hoy}              icon={Phone}      />
        <Stat label="LLAMADAS SEMANA" value={stats.llamadas_semana}           icon={BarChart2}  />
        <Stat label="VENTAS SEMANA"   value={stats.ventas_semana}             icon={TrendingUp} />
        <Stat label="DURACIÓN MEDIA"  value={fmtSeg(stats.duracion_media_hoy)} icon={Clock}    />
      </div>

      {/* Tasa de conversión */}
      <Card className="p-4 border-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Tasa de conversión hoy</p>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-black font-mono text-white">{stats.tasa_conversion_hoy}%</span>
          <span className="text-xs text-slate-500 font-mono pb-1">
            {stats.ventas_hoy} venta{stats.ventas_hoy !== 1 ? 's' : ''} / {stats.llamadas_hoy} llamada{stats.llamadas_hoy !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="mt-3 h-2 bg-slate-800 rounded-sm overflow-hidden">
          <div
            className="h-full bg-[#D00000] transition-all duration-700"
            style={{ width: `${Math.min(stats.tasa_conversion_hoy, 100)}%` }}
          />
        </div>
      </Card>

      {/* Desglose por resultado */}
      <Card className="p-4 border-slate-800 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Desglose hoy</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {RESULTADOS.map(({ key, label, color }) => {
            const val = stats[key] || 0;
            const pct = stats.llamadas_hoy > 0 ? Math.round(100 * val / stats.llamadas_hoy) : 0;
            return (
              <div key={key} className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex flex-col gap-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{label}</span>
                <span className="text-2xl font-black font-mono text-white">{val}</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-slate-800 rounded-sm overflow-hidden">
                    <div className="h-full bg-slate-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
};

export default MisResultados;
