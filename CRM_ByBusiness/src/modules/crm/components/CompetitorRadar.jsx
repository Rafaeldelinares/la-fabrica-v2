
import React, { useState } from 'react';
import { Search, Info, TrendingUp, TrendingDown, MessageSquare, Loader2 } from 'lucide-react';
import { getBusinessReputation } from '../../../services/reputationService';

const CompetitorRadar = ({ leadData }) => {
  const [competitorName, setCompetitorName] = useState('');
  const [competitorData, setCompetitorData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showArgument, setShowArgument] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!competitorName.trim()) return;

    setLoading(true);
    setError(null);
    setShowArgument(false);
    
    const result = await getBusinessReputation(competitorName);
    if (result.offline) {
      setError('Rival fuera de alcance');
    } else {
      setCompetitorData(result.data);
    }
    setLoading(false);
  };

  const calculateComparison = () => {
    if (!leadData || !competitorData) return null;
    
    const leadRating = leadData.rating || 0;
    const rivalRating = competitorData.rating || 0;
    const leadPhotos = leadData.images_count || 0;
    const rivalPhotos = competitorData.images_count || 0;
    
    const isRivalBetterRating = rivalRating > leadRating;
    const isRivalBetterPhotos = rivalPhotos > (leadPhotos * 1.5);
    const leadHasNoResponse = !leadData.is_owner_verified;
    
    let text = isRivalBetterRating 
        ? `Dato clave: ${competitorData.name || 'El rival'} capta más clientes por reseñas (${rivalRating} vs ${leadRating}). `
        : `Refuerzo positivo: Estás por encima de ${competitorData.name || 'la competencia'} en rating. `;
    
    if (isRivalBetterPhotos) {
        text += `Alerta Visual: Tu competencia tiene un contenido visual mucho más potente (${rivalPhotos} fotos). Necesitas un reportaje urgente. `;
    }
    
    if (leadHasNoResponse) {
        text += `Alerta de Gestión: Tu perfil no está verificado o no responde. Estás perdiendo clientes por silencio administrativo. Activa nuestro servicio de Respuesta IA. `;
    }
    
    return {
        isRivalBetter: isRivalBetterRating || isRivalBetterPhotos,
        text
    };
  };

  const comparison = calculateComparison();

  // Helper for max value scaling
  const getScale = (val, rivalVal) => {
      const max = Math.max(val, rivalVal, 1);
      return (val / max) * 100;
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm mt-4">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center">
        <Search size={12} className="mr-2" /> Radar de Competencia 2.0
      </h3>

      <form onSubmit={handleSearch} className="relative mb-6">
        <input 
          type="text" 
          placeholder="🔍 Comparar con..."
          value={competitorName}
          onChange={(e) => setCompetitorName(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-xs text-slate-300 focus:outline-none focus:border-red-500/50 transition-all"
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-2 text-slate-500 animate-spin" />}
      </form>

      {competitorData && (
        <div className="space-y-6">
          {/* CATEGORY 1: RATING */}
          <div className="space-y-2">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">★ Opinión Pública</span>
            <div className="flex flex-col gap-2">
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/50" style={{ width: `${(leadData?.rating || 0) * 20}%` }}></div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500/50" style={{ width: `${(competitorData.rating || 0) * 20}%` }}></div>
                </div>
            </div>
          </div>

          {/* CATEGORY 2: PHOTOS */}
          <div className="space-y-2">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">📸 Impacto Visual ({leadData?.images_count || 0} vs {competitorData.images_count || 0})</span>
            <div className="flex flex-col gap-2">
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/50" style={{ width: `${getScale(leadData?.images_count || 0, competitorData.images_count || 0)}%` }}></div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500/50" style={{ width: `${getScale(competitorData.images_count || 0, leadData?.images_count || 0)}%` }}></div>
                </div>
            </div>
          </div>

          {/* CATEGORY 3: ATTENTION */}
          <div className="space-y-2">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">🗣️ Atención al Cliente (Verificado)</span>
            <div className="flex gap-4">
                <div className={`flex-1 h-1 rounded-full ${leadData?.is_owner_verified ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`}></div>
                <div className={`flex-1 h-1 rounded-full ${competitorData.is_owner_verified ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`}></div>
            </div>
          </div>

          {/* ARGUMENTARIO TOGGLE */}
          <div className="pt-4 border-t border-slate-800/50">
            <button 
              onClick={() => setShowArgument(!showArgument)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-[10px] font-bold uppercase tracking-widest group"
            >
              <MessageSquare size={12} className="opacity-50 group-hover:opacity-100" />
              {showArgument ? 'Ocultar Munición' : 'Ver Argumentario'}
            </button>

            {/* ARGUMENT PANEL */}
            {showArgument && (
              <div className="mt-4 p-4 bg-slate-950/80 border-l-2 border-red-500 rounded-r-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex gap-3">
                    <Info size={16} className="text-red-500 shrink-0" />
                    <p className="text-[11px] text-slate-300 leading-relaxed italic">
                        "{comparison?.text}"
                    </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="text-[10px] text-red-500 font-mono text-center mt-2 uppercase">{error}</div>}
    </div>
  );
};

export default CompetitorRadar;
