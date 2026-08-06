/**
 * GbpFichaActual — Current GBP audit display + top-5 gap recommendations.
 * Sub-components: Pill, RecomendacionesList.
 * @since gbp-ficha-improvements S2 (2026-08-05)
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Star, MessageSquare, Camera } from 'lucide-react';
import { computeGaps } from './pure/gaps';

const Pill = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
    ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
       : 'bg-slate-800 text-slate-500 border border-slate-700'
  }`}>{ok ? '✓' : '–'} {label}</span>
);
Pill.propTypes = { ok: PropTypes.bool, label: PropTypes.string.isRequired };

const RecomendacionesList = ({ gaps }) => gaps.length === 0 ? (
  <p className="text-[10px] text-emerald-400 font-mono">Sin recomendaciones — ficha en buen estado</p>
) : (
  <div className="flex flex-col gap-0.5">
    {gaps.slice(0, 5).map((gap) => {
      const dotClass =
        gap.severity === 'high' ? 'bg-red-400' :
        gap.severity === 'med'  ? 'bg-amber-400' : 'bg-slate-500';
      return (
        <div key={gap.code} className="flex items-center gap-2 py-0.5">
          <span className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${dotClass}`} />
          <span className="text-[10px] font-mono text-slate-500">{gap.code}</span>
          <span className="text-xs text-slate-300 flex-1">{gap.human_label}</span>
          <span className="text-[10px] font-mono text-slate-600">{gap.evidence ?? ''}</span>
        </div>
      );
    })}
  </div>
);
RecomendacionesList.propTypes = { gaps: PropTypes.arrayOf(PropTypes.object).isRequired };

const GbpFichaActual = ({ audit }) => {
  if (!audit) {
    return (
      <p className="text-[10px] text-slate-600 font-mono text-center py-4 border border-dashed border-slate-800 rounded-sm">
        Ejecute Auditar para cargar la ficha.
      </p>
    );
  }
  const tieneHorarios = (audit.horarios_dias_cubiertos ?? 0) >= 5;
  const tieneFotos    = (audit.fotos_count ?? 0) >= 3;
  const tieneDesc     = audit.descripcion && audit.descripcion.length > 50;
  const tieneQA       = (audit.qa_count ?? 0) > 0;
  const tienePosts    = (audit.posts_count ?? 0) > 0;
  const pctAtributos = audit.atributos_total > 0
    ? Math.round((audit.atributos_seteados / audit.atributos_total) * 100) : null;
  const pctReviews    = audit.reviews_count > 0
    ? Math.round((audit.reviews_respondidas_pct || 0) * 100) : null;
  const gaps = computeGaps(audit);
  return (
    <div className="flex flex-col gap-4 py-1">
      {audit.categoria_principal && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Categoría</span>
          <span className="text-xs text-slate-300 font-mono">{audit.categoria_principal}</span>
          {audit.categorias_secundarias?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {audit.categorias_secundarias.slice(0, 4).map((cat) => (
                <span key={cat}
                  className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded-sm border border-slate-700">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 border border-slate-800 rounded-sm px-2 py-2 text-center">
          <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest flex items-center justify-center gap-1">
            <Star size={8} className="text-amber-400" /> Rating
          </p>
          <p className="text-lg font-mono font-bold text-slate-200 mt-1">
            {audit.rating_promedio != null ? Number(audit.rating_promedio).toFixed(1) : '—'}
            <span className="text-xs text-slate-600">/5</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-sm px-2 py-2 text-center">
          <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest flex items-center justify-center gap-1">
            <MessageSquare size={8} /> Reviews
          </p>
          <p className="text-lg font-mono font-bold text-slate-200 mt-1">{audit.reviews_count ?? 0}</p>
          <p className="text-[9px] text-slate-600 font-mono">{pctReviews !== null ? `${pctReviews}% resp.` : '—'}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-sm px-2 py-2 text-center">
          <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest flex items-center justify-center gap-1">
            <Camera size={8} /> Fotos
          </p>
          <p className="text-lg font-mono font-bold text-slate-200 mt-1">{audit.fotos_count ?? 0}</p>
          <p className="text-[9px] text-slate-600 font-mono">
            {audit.ultima_foto_fecha ? audit.ultima_foto_fecha.slice(0, 10) : '—'}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Checklist</span>
        <div className="flex flex-wrap gap-1.5">
          <Pill ok={tieneHorarios}   label="Horarios" />
          <Pill ok={tieneFotos}      label={`Fotos ×${audit.fotos_count ?? 0}`} />
          <Pill ok={tieneDesc}       label="Descripción" />
          <Pill ok={tieneQA}         label={`Q&A ×${audit.qa_count ?? 0}`} />
          <Pill ok={tienePosts}      label={`Posts ×${audit.posts_count ?? 0}`} />
          <Pill ok={pctAtributos !== null && pctAtributos >= 60}
            label={pctAtributos !== null ? `Atributos ${audit.atributos_seteados}/${audit.atributos_total}` : 'Atributos'} />
          <Pill ok={pctReviews !== null && pctReviews >= 50}
            label={pctReviews !== null ? `Resp. ${pctReviews}%` : 'Reviews'} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Detalles</span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
          <span className="text-slate-500">Días cubiertos</span>
          <span className="text-slate-300">{audit.horarios_dias_cubiertos ?? '—'}</span>
          <span className="text-slate-500">Reviews cargadas</span>
          <span className="text-slate-300">{audit.reviews_count ?? 0}</span>
          <span className="text-slate-500">Reviews resp.</span>
          <span className="text-slate-300">{audit.reviews_respondidas_count ?? 0} ({audit.reviews_respondidas_pct ?? 0}%)</span>
          <span className="text-slate-500">Q&A</span>
          <span className="text-slate-300">{audit.qa_count ?? 0}</span>
          <span className="text-slate-500">Posts</span>
          <span className="text-slate-300">{audit.posts_count ?? 0}</span>
          <span className="text-slate-500">Atributos</span>
          <span className="text-slate-300">{audit.atributos_seteados ?? 0}/{audit.atributos_total ?? 0}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Recomendaciones</span>
        <RecomendacionesList gaps={gaps} />
      </div>
    </div>
  );
};
GbpFichaActual.propTypes = { audit: PropTypes.object };
export default GbpFichaActual;
