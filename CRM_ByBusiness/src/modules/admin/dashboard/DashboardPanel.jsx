import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../shared/ui/Card';
import Stat from '../../../shared/ui/Stat';
import Badge from '../../../shared/ui/Badge';

const PRIORIDAD_CLASSES = {
  alta:   'bg-red-500/10 text-red-500 border-red-500/20',
  normal: 'bg-slate-600/10 text-slate-300 border-slate-600/50',
  baja:   'bg-slate-800 text-slate-500 border-slate-700',
};

/**
 * DashboardPanel — Panel principal de administración con KPIs de negocio,
 * últimos leads, actividad de operadores y métricas de captación web.
 * Consume crm-kpi-dashboard, crm-leads-admin y crm-actividad-operadores vía n8n.
 */
const DashboardPanel = () => {
  const [kpis, setKpis]           = useState(null);
  const [leads, setLeads]         = useState([]);
  const [actividad, setActividad] = useState(null);
  const [errorKpis, setErrorKpis]         = useState('');
  const [errorActividad, setErrorActividad] = useState('');

  const N8N = import.meta.env.VITE_N8N_URL;

  useEffect(() => {
    fetch(`${N8N}/crm-kpi-dashboard`)
      .then(r => r.json())
      .then(d => { if (d.ok) setKpis(d.kpis); else setErrorKpis('Error al cargar KPIs del dashboard'); })
      .catch(() => setErrorKpis('Error al cargar KPIs — comprueba la conexión'));

    fetch(`${N8N}/crm-leads-admin?limit=5`)
      .then(r => r.json())
      .then(d => { if (d.ok) setLeads(d.leads || []); })
      .catch(() => {});

    fetch(`${N8N}/crm-actividad-operadores`)
      .then(r => r.json())
      .then(d => { if (d.ok) setActividad(d); else setErrorActividad('Error al cargar actividad de operadores'); })
      .catch(() => setErrorActividad('Error al cargar actividad — comprueba la conexión'));
  }, []);

  const tasa = actividad && actividad.total_llamadas_hoy > 0
    ? Math.round(100 * actividad.total_ventas_hoy / actividad.total_llamadas_hoy)
    : 0;

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto bg-slate-950 font-sans">

      {/* Error banners */}
      {errorKpis && (
        <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
          {errorKpis}
        </div>
      )}
      {errorActividad && (
        <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
          {errorActividad}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="LEADS HOY"   value={kpis?.leads?.hoy ?? '—'}                  trend={kpis ? `${kpis.leads.total} total` : ''} />
        <Stat label="LLAMADAS HOY" value={actividad?.total_llamadas_hoy ?? '—'}     trend={actividad ? `${actividad.operadores?.length} ops activos` : ''} />
        <Stat label="VENTAS HOY"   value={actividad?.total_ventas_hoy ?? '—'}       trend={kpis ? `${kpis.leads.por_estado?.convertido ?? 0} convertidos` : ''} />
        <Stat label="CONVERSIÓN"   value={actividad ? `${tasa}%` : '—'}            trend="llamadas → venta" />
      </div>

      {/* Últimos leads + Actividad operadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card className="flex flex-col bg-slate-900 border-slate-800 !p-5">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">ÚLTIMOS LEADS</h3>
          <div className="flex flex-col flex-1 gap-0">
            {leads.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-6">
                <p className="text-[10px] text-slate-700 font-mono uppercase tracking-widest italic">Sin leads recientes</p>
              </div>
            ) : leads.map(lead => (
              <div key={lead.id} className="flex justify-between items-center text-xs text-slate-200 border-b border-slate-800/50 py-2.5">
                <span className="font-bold uppercase tracking-wide truncate pr-3">{lead.nombre_comercial}</span>
                <div className="flex gap-2 items-center shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono">{lead.localidad}</span>
                  <Badge className={PRIORIDAD_CLASSES[lead.prioridad] || PRIORIDAD_CLASSES.normal}>
                    {lead.prioridad?.toUpperCase() || '—'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col bg-slate-900 border-slate-800 !p-5">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">ACTIVIDAD OPERADORES HOY</h3>
          <div className="flex flex-col gap-0 flex-1">
            {!actividad ? (
              <div className="flex-1 flex items-center justify-center py-6">
                <p className="text-[10px] text-slate-700 font-mono uppercase tracking-widest italic">Cargando...</p>
              </div>
            ) : actividad.operadores?.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-6">
                <p className="text-[10px] text-slate-700 font-mono uppercase tracking-widest italic">Sin actividad hoy</p>
              </div>
            ) : actividad.operadores?.map(op => (
              <div key={op.id} className="flex justify-between items-center py-2.5 border-b border-slate-800/50">
                <span className="text-xs font-bold text-slate-200">{op.nombre}</span>
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                  <span>{op.llamadas_hoy} llamadas</span>
                  <span className="text-emerald-400 font-bold">{op.ventas_hoy} ventas</span>
                  <span className="text-slate-600">{op.tasa_hoy}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* Captación Web */}
      <Card className="bg-slate-900 border-slate-800 !p-5">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">CAPTACIÓN WEB</h3>
        <div className="flex items-center gap-8 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Contactos totales</span>
            <span className="text-2xl font-black font-mono text-white">{kpis?.captacion?.total_contactos ?? '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Auditorías</span>
            <span className="text-2xl font-black font-mono text-white">{kpis?.captacion?.auditoria ?? '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Empleo</span>
            <span className="text-2xl font-black font-mono text-white">{kpis?.captacion?.empleo ?? '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Candidatos RRHH</span>
            <span className="text-2xl font-black font-mono text-white">{kpis?.rrhh?.total_candidatos ?? '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Leads pendientes</span>
            <span className="text-2xl font-black font-mono text-[#D00000]">{kpis?.leads?.por_estado?.pendiente ?? '—'}</span>
          </div>
        </div>
      </Card>

    </div>
  );
};

/** Panel autónomo — no recibe props externas */
DashboardPanel.propTypes = {};

export default DashboardPanel;
