import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useMutation } from '@tanstack/react-query';
import { n8nPost } from '../../../../shared/hooks/useN8n';

/** Score badge color by percentage */
const scoreColor = (pct) => {
  if (pct >= 80) return 'text-emerald-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-red-400';
};

/** Format cache age string */
const cacheAge = (cachedAt) => {
  if (!cachedAt) return null;
  const cached = new Date(cachedAt);
  const now = new Date();
  const diffMs = now - cached;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffH < 24) return `hace ${diffH}h`;
  return cached.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

/** Status pill for single-item checks */
const StatusPill = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
    ok
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-slate-800 text-slate-500 border border-slate-700'
  }`}>
    {ok ? '✓' : '–'} {label}
  </span>
);

/**
 * TabOptimizacionGbp — Panel de optimización Google Business Profile.
 * Muestra checklist de auditoría GBP + score general.
 * @param {{ clienteId: number }} props
 */
const TabOptimizacionGbp = ({ clienteId }) => {
  const [placeId,       setPlaceId]       = useState('');
  const [guardadoPlace, setGuardadoPlace] = useState(false);
  const [errorPlace,    setErrorPlace]    = useState(null);
  const [forceRefresh,  setForceRefresh]  = useState(false);
  const timerRef = useRef(null);

  const scrapeMut = useMutation({
    // staleTime 30 min — backend caches for 24h
    mutationFn: (pid) => n8nPost('crm-gbp-ficha-audit', {
      place_id: pid,
      refresh: forceRefresh,
    }),
    staleTime: 30 * 60 * 1000,
  });

  const handleScrape = () => {
    if (!placeId.trim()) { setErrorPlace('Place ID requerido'); return; }
    setErrorPlace(null);
    setForceRefresh(false);
    scrapeMut.mutate(placeId.trim());
  };

  const handleRefresh = () => {
    if (!placeId.trim()) { setErrorPlace('Place ID requerido'); return; }
    setErrorPlace(null);
    setForceRefresh(true);
    scrapeMut.mutate(placeId.trim());
  };

  const handleSavePlaceId = async () => {
    setGuardadoPlace(false);
    setErrorPlace(null);
    if (!placeId.trim()) return;
    try {
      await n8nPost('crm-cliente-google-place-id', {
        cliente_id: clienteId,
        google_place_id: placeId.trim(),
      });
      setGuardadoPlace(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setGuardadoPlace(false), 2000);
    } catch { setErrorPlace('Error al guardar'); }
  };

  const audit     = scrapeMut.data && !scrapeMut.data.error ? scrapeMut.data : null;
  const isLoading = scrapeMut.isPending;
  const isCached  = audit && audit._cached === true;
  const cachedAt   = audit && audit._cached_at;
  const durationMs = audit && audit._scrape_duration_ms;

  // Score calculation — all available signals
  const pctAtributos = audit && audit.atributos_total > 0
    ? Math.round((audit.atributos_seteados / audit.atributos_total) * 100)
    : null;

  const pctReviews = audit && audit.reviews_count > 0
    ? Math.round((audit.reviews_respondidas_pct || 0) * 100)
    : null;

  const pctFotos = audit && audit.fotos_count >= 10
    ? 80 : audit && audit.fotos_count >= 3
    ? 50 : null;

  const pctDesc = audit && audit.descripcion && audit.descripcion.length > 50
    ? 80 : audit && audit.descripcion ? 40 : null;

  const pctQA = audit && audit.qa_count > 0 ? 50 : null;

  const pctPosts = audit && audit.posts_count > 0 ? 50 : null;

  const tieneHorarios = audit && audit.horarios_dias_cubiertos >= 5;
  const tieneFotos    = audit && (audit.fotos_count ?? 0) >= 3;
  const tieneDesc     = audit && audit.descripcion && audit.descripcion.length > 50;
  const tieneQA       = (audit?.qa_count ?? 0) > 0;

  // Weighted average: atributos 40%, reviews 30%, fotos 15%, desc 10%, qa/posts 5%
  const scoreItems = [
    pctAtributos !== null ? [pctAtributos, 0.40] : null,
    pctReviews    !== null ? [pctReviews,    0.30] : null,
    pctFotos     !== null ? [pctFotos,       0.15] : null,
    pctDesc      !== null ? [pctDesc,         0.10] : null,
    pctQA        !== null ? [pctQA,           0.03] : null,
    pctPosts     !== null ? [pctPosts,        0.02] : null,
  ].filter(Boolean);

  const avgScore = scoreItems.length > 0
    ? Math.round(scoreItems.reduce((acc, [val, weight]) => acc + val * weight, 0))
    : null;

  return (
    <div className="flex flex-col gap-4 px-3 py-4">

      {/* ── Place ID input ── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          Google Place ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={placeId}
            onChange={e => { setPlaceId(e.target.value); setErrorPlace(null); setGuardadoPlace(false); }}
            placeholder="ChIJN1rTLr-GyuEmsRBfNs7J4aca"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-sm px-2 py-1 text-[10px] text-slate-300 font-mono outline-none focus:border-slate-500 transition-colors placeholder:text-slate-700 min-w-0"
          />
          <button
            onClick={handleSavePlaceId}
            disabled={!placeId.trim()}
            className="text-[9px] font-mono px-2 py-1 rounded-sm border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 disabled:opacity-30 transition-colors shrink-0"
          >
            {guardadoPlace ? '✓' : 'Guardar'}
          </button>
          <button
            onClick={handleScrape}
            disabled={isLoading || !placeId.trim()}
            className="text-[9px] font-mono px-2 py-1 rounded-sm border border-[#D00000]/30 text-[#D00000]/70 hover:text-[#D00000] hover:border-[#D00000]/60 transition-colors disabled:opacity-30 shrink-0"
          >
            {isLoading ? '…' : 'Auditar'}
          </button>
          {audit && (
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              title="Forzar recarga desde Google (ignora cache)"
              className="text-[9px] font-mono px-2 py-1 rounded-sm border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 transition-colors shrink-0"
            >
              ⟳
            </button>
          )}
        </div>
        {errorPlace && <p className="text-[10px] text-red-400 font-mono">{errorPlace}</p>}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono px-2">
          <span className="animate-pulse text-[8px]">●</span> Extrayendo datos de Google…
          {durationMs && (
            <span className="text-slate-600 ml-auto">
              {Math.round(durationMs / 1000)}s
            </span>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {scrapeMut.data?.error && !isLoading && (
        <div className="border border-red-500/20 rounded-sm px-3 py-2 bg-red-500/5">
          <p className="text-[10px] text-red-400 font-mono">
            {scrapeMut.data.error}
            {scrapeMut.data.place_id ? ` (place_id: ${scrapeMut.data.place_id})` : ''}
          </p>
        </div>
      )}

      {/* ── Audit results ── */}
      {audit && !isLoading && (
        <>
          {/* Cache status bar */}
          {isCached && cachedAt && (
            <div className="flex items-center gap-2 text-[9px] text-slate-600 font-mono px-1">
              <span>📦</span>
              <span>Cache: {cacheAge(cachedAt)}</span>
              {durationMs && (
                <span className="ml-auto">Scrape: {Math.round(durationMs / 1000)}s</span>
              )}
            </div>
          )}
          {!isCached && !isLoading && durationMs && (
            <div className="flex items-center gap-2 text-[9px] text-slate-600 font-mono px-1">
              <span>🔄</span>
              <span>Fresh scrape</span>
              <span className="ml-auto">Scrape: {Math.round(durationMs / 1000)}s</span>
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 border border-slate-800 rounded-sm px-3 py-3 text-center">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Score GBP</p>
              <p className={`text-2xl font-mono font-bold mt-1 ${scoreColor(avgScore ?? 0)}`}>
                {avgScore ?? '—'}<span className="text-xs text-slate-600">%</span>
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-sm px-3 py-3 text-center">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Reviews</p>
              <p className="text-xl font-mono font-bold text-slate-300 mt-1">{audit.reviews_count ?? 0}</p>
              <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                {pctReviews !== null ? `${pctReviews}% resp.` : '—'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-sm px-3 py-3 text-center">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Rating</p>
              <p className="text-xl font-mono font-bold text-slate-300 mt-1">
                {audit.rating_promedio != null ? Number(audit.rating_promedio).toFixed(1) : '—'}
              </p>
              <p className="text-[9px] text-slate-600 font-mono mt-0.5">/ 5.0</p>
            </div>
          </div>

          {/* Categoria */}
          {audit.categoria_principal && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Categoría</span>
              <span className="text-xs text-slate-300 font-mono">{audit.categoria_principal}</span>
              {audit.categorias_secundarias?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {audit.categorias_secundarias.slice(0, 4).map(cat => (
                    <span key={cat} className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded-sm border border-slate-700">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Checklist */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Checklist</span>
            <div className="flex flex-wrap gap-1.5">
              <StatusPill ok={tieneHorarios}  label="Horarios" />
              <StatusPill ok={tieneFotos}     label={`Fotos ×${audit.fotos_count ?? 0}`} />
              <StatusPill ok={tieneDesc}     label="Descripción" />
              <StatusPill ok={tieneQA}        label={`Q&A ×${audit.qa_count ?? 0}`} />
              <StatusPill ok={(audit.posts_count ?? 0) > 0} label={`Posts ×${audit.posts_count ?? 0}`} />
              <StatusPill
                ok={pctAtributos !== null && pctAtributos >= 60}
                label={pctAtributos !== null ? `Atributos ${audit.atributos_seteados}/${audit.atributos_total}` : 'Atributos'}
              />
              <StatusPill
                ok={pctReviews !== null && pctReviews >= 50}
                label={pctReviews !== null ? `Reviews resp. ${pctReviews}%` : 'Reviews'}
              />
            </div>
          </div>

          {/* Detalles */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Detalles</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
              <span className="text-slate-500">Días cubiertos</span>
              <span className="text-slate-300">{audit.horarios_dias_cubiertos ?? '—'}</span>
              <span className="text-slate-500">Reviews cargadas</span>
              <span className="text-slate-300">{audit.reviews_count ?? 0}</span>
              <span className="text-slate-500">Reviews resp.</span>
              <span className="text-slate-300">{audit.reviews_respondidas_count ?? 0} ({audit.reviews_respondidas_pct ?? 0}%)</span>
              <span className="text-slate-500">Fotos</span>
              <span className="text-slate-300">{audit.fotos_count ?? 0}</span>
              <span className="text-slate-500">Última foto</span>
              <span className="text-slate-300">{audit.ultima_foto_fecha || '—'}</span>
              <span className="text-slate-500">Q&A</span>
              <span className="text-slate-300">{audit.qa_count ?? 0}</span>
              <span className="text-slate-500">Posts</span>
              <span className="text-slate-300">{audit.posts_count ?? 0}</span>
              <span className="text-slate-500">Atributos</span>
              <span className="text-slate-300">{audit.atributos_seteados ?? 0}/{audit.atributos_total ?? 0}</span>
            </div>
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!audit && !isLoading && (
        <div className="py-8 text-center border border-dashed border-slate-800 rounded-sm">
          <p className="text-[10px] text-slate-600 font-mono">
            Ingresá el Google Place ID y hacé clic en Auditar
          </p>
        </div>
      )}
    </div>
  );
};

TabOptimizacionGbp.propTypes = {
  clienteId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default TabOptimizacionGbp;
