import React, { useState, useEffect } from 'react';
import { MapPin, Star, MessageSquare, FileText, RefreshCw } from 'lucide-react';

const Stat = ({ label, value, icon: Icon, color = 'text-white', sub }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{label}</p>
      <Icon size={14} className="text-slate-600" />
    </div>
    <p className={`text-2xl font-black font-mono ${color}`}>{value ?? '—'}</p>
    {sub && <p className="text-[10px] text-slate-600 font-mono">{sub}</p>}
  </div>
);

const GbpDashboardPanel = () => {
  const [kpis, setKpis] = useState(null);
  const base = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

  const cargar = () => {
    setKpis(null);
    fetch(`${base}/crm-gbp-kpis`)
      .then(r => r.json())
      .then(d => { if (d.ok) setKpis(d.kpis); })
      .catch(() => setKpis({}));
  };

  useEffect(cargar, []);

  if (kpis === null) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-sm animate-pulse" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Resumen de cartera GBP</p>
        <button onClick={cargar} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
          <RefreshCw size={11} /> Actualizar
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Fichas activas"      value={kpis.fichas_activas}          icon={MapPin}        color="text-white" />
        <Stat label="Reseñas pendientes"  value={kpis.resenas_pendientes}       icon={MessageSquare} color="text-amber-400" />
        <Stat label="Rating promedio"     value={kpis.rating_promedio_cartera}  icon={Star}          color="text-emerald-400" sub="media cartera" />
        <Stat label="Posts hoy"           value={kpis.posts_hoy}                icon={FileText}      color="text-blue-400" />
      </div>
    </div>
  );
};

export default GbpDashboardPanel;
