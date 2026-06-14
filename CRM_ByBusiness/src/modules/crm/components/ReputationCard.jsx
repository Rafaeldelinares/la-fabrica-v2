
import React from 'react';
import { Star, MapPin, ExternalLink, AlertTriangle, Save } from 'lucide-react';

const ReputationCard = ({ data, loading, error, onSave }) => {
  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-xl shadow-2xl animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-slate-800 rounded w-1/4 mb-6"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-2 bg-slate-800 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900/80 border border-rose-500/30 p-6 rounded-xl shadow-2xl flex flex-col items-center justify-center text-center">
        <AlertTriangle className="text-rose-500 mb-2" size={32} />
        <h3 className="text-slate-300 font-bold mb-1">Error de Conexión</h3>
        <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">{error || 'Sin datos de reputación'}</p>
      </div>
    );
  }

  const { name, rating, reviews, breakdown, address } = data;
  
  // Calculate if reviews 1 and 2 are > 10%
  const totalReviews = reviews || 1;
  const negativeReviews = (breakdown?.["1"] || 0) + (breakdown?.["2"] || 0);
  const negPercentage = (negativeReviews / totalReviews) * 100;
  const isCritical = negPercentage > 10;

  return (
    <div className={`bg-slate-900/90 border ${isCritical ? 'border-rose-500/50' : 'border-slate-700'} p-6 rounded-xl shadow-2xl backdrop-blur-md relative overflow-hidden group`}>
      {isCritical && (
        <div className="absolute top-0 right-0 p-2">
            <div className="flex items-center gap-1 bg-rose-500/20 text-rose-500 text-[10px] font-black px-2 py-1 rounded-bl-lg animate-pulse">
                <AlertTriangle size={12} /> ALERTA CRÍTICA
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">Reputación de Mercado</h3>
        <div className="flex items-end gap-3">
            <span className="text-3xl font-black text-white leading-none">{rating}</span>
            <div className="flex flex-col">
                <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={14} fill={i <= Math.round(rating) ? "currentColor" : "none"} className={i <= Math.round(rating) ? "" : "text-slate-700"} />
                    ))}
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{reviews} Reseñas totales</span>
            </div>
        </div>
      </div>

      {/* BREAKDOWN BARS */}
      <div className="space-y-2 mb-6">
        {[5, 4, 3, 2, 1].map(star => {
          const count = breakdown?.[star.toString()] || 0;
          const percentage = (count / totalReviews) * 100;
          return (
            <div key={star} className="flex items-center gap-2 group/bar">
              <span className="text-[10px] font-mono text-slate-500 w-2">{star}</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-1000 ${star <= 2 ? 'bg-rose-500' : star === 3 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="text-[9px] font-mono text-slate-500 w-6 text-right opacity-0 group-hover/bar:opacity-100 transition-opacity">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* INSIGHT RECUADRO ROJO */}
      {isCritical && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg mb-6">
            <p className="text-rose-400 text-[10px] font-bold leading-tight uppercase">
                <span className="text-rose-500 mr-1 underline text-xs">ARGUMENTO:</span> 
                El {negPercentage.toFixed(1)}% de los clientes están descontentos. 
                Fuga Crítica detectada en canales digitales.
            </p>
        </div>
      )}

      {/* FOOTER ACTIONS */}
      <div className="flex gap-2 border-t border-slate-800 pt-4 mt-2">
        <button 
           onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + address)}`, '_blank')}
           className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold py-2 rounded transition-all tracking-widest uppercase"
        >
          <ExternalLink size={12} /> Ver en Maps
        </button>
        <button 
           onClick={onSave}
           className="flex-1 flex items-center justify-center gap-2 bg-[#D00000] hover:bg-rose-700 text-white text-[10px] font-bold py-2 rounded transition-all tracking-widest uppercase shadow-lg shadow-rose-900/20"
        >
          <Save size={12} /> Guardar Ficha
        </button>
      </div>
    </div>
  );
};

export default ReputationCard;
