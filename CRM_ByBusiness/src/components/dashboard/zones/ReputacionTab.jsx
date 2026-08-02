import React from 'react';
import { Star, AlertTriangle, RefreshCw, Clock, User, TrendingUp } from 'lucide-react';
import { useN8nQuery } from '../../../shared/hooks/useN8n';
import Skeleton from '../../../shared/ui/Skeleton';
import EmptyState from '../../../shared/ui/EmptyState';
import { reportError } from '../../../shared/errors/reportError';
import { fmtFechaHora } from '../../../utils/dates';

/**
 * ReputacionTab — displays live reputation data for a Google Business Profile.
 * Reads CRM_REPUTACION_LEAD which calls Monitor Reputación engine (:8092).
 * Shows: score (0-100), stars (1-5), review count, last 3 reviews.
 * Alert banner when score < 60 or stars < 3.5.
 *
 * @param {{ placeId: string }} props
 */
const ReputacionTab = ({ placeId }) => {
  const { data, isLoading, isError, refetch, isFetching } = useN8nQuery(
    ['reputacion-lead', placeId],
    'crm-reputacion-lead',
    { params: { place_id: placeId }, staleTime: 60_000 }
  );

  const score = data?.score;
  const stars = data?.stars;
  const reviewCount = data?.review_count;
  const reviews = data?.reviews || [];
  const alertState = data?.alert_state === true;
  const refreshedAt = data?.refreshed_at;
  const isUnavailable = isError || data?.error === 'engine_unreachable' || data?.error === 'no_response';

  const reportedRef = React.useRef(false);
  React.useEffect(() => {
    if (isUnavailable && !reportedRef.current) {
      reportedRef.current = true;
      reportError(new Error('Monitor Reputación engine unreachable'), {
        componentStack: 'ReputacionTab', zoneId: 'Zone2-REPUTACION',
      });
    }
  }, [isUnavailable]);

  if (!placeId) {
    return (
      <div className="p-4">
        <EmptyState icon={Star} title="Sin datos de reputación disponibles"
          description="Este lead no tiene un perfil de Google Business asociado." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-white">Monitor de Reputación</p>
        </div>
        <div className="flex items-center gap-2">
          {refreshedAt && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
              <Clock size={10} />{fmtFechaHora(refreshedAt)}
            </span>
          )}
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 bg-slate-900 border border-slate-800 rounded-sm text-slate-500 hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertState && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#D00000]/10 border border-[#D00000]/20 rounded-sm text-xs text-[#D00000]">
          <AlertTriangle size={14} />Puntuación por debajo del umbral — requiere atención
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 px-4 py-4 bg-slate-900 border border-slate-800 rounded-sm">
            <Skeleton className="w-12 h-12 rounded-sm" type="rect" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-4 w-24" type="rect" />
              <Skeleton className="h-3 w-16" type="rect" />
            </div>
          </div>
          {[1, 2].map(i => (
            <div key={i} className="flex flex-col gap-2 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm">
              <Skeleton className="h-3 w-40" type="rect" />
              <Skeleton className="h-3 w-full" type="rect" />
            </div>
          ))}
        </div>
      )}

      {/* Unavailable */}
      {!isLoading && isUnavailable && (
        <div className="py-8">
          <EmptyState icon={Star} title="Reputación temporalmente no disponible"
            description="No se pudo obtener los datos de reputación. Intenta de nuevo más tarde." />
        </div>
      )}

      {/* Reputation Content */}
      {!isLoading && !isUnavailable && (
        <div className="flex flex-col gap-3">
          {/* Score row */}
          <div className="flex items-center gap-4 px-4 py-4 bg-slate-900 border border-slate-800 rounded-sm">
            <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-800 border border-slate-700 rounded-sm">
              <span className="text-xl font-bold font-mono text-white">{score ?? '—'}</span>
              <span className="text-[10px] text-slate-500 uppercase">/ 100</span>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(val => (
                  <Star key={val} size={12}
                    className={val <= Math.round(stars ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
                ))}
                <span className="ml-1 text-xs font-mono text-slate-400">{stars?.toFixed(1) ?? '—'}</span>
              </div>
              <p className="text-xs text-slate-400">
                {reviewCount != null ? `${reviewCount.toLocaleString()} reseñas` : 'Sin datos de reseñas'}
              </p>
            </div>
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Últimas reseñas</p>
              {reviews.map((review, idx) => (
                <ReviewCard key={idx} review={review} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReviewCard = ({ review }) => {
  const { author, text, rating, date } = review;
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 bg-slate-900 border border-slate-800 rounded-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <User size={10} className="text-slate-500" />
          <span className="text-xs font-medium text-slate-300">{author || 'Anónimo'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {rating != null && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(val => (
                <Star key={val} size={8}
                  className={val <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
              ))}
            </div>
          )}
          {date && <span className="text-[10px] font-mono text-slate-500">{fmtFechaHora(date)}</span>}
        </div>
      </div>
      {text && <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{text}</p>}
    </div>
  );
};

export default ReputacionTab;
