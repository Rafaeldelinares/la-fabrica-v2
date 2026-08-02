import React from 'react';
import { Star, User } from 'lucide-react';
import { fmtFechaHora } from '../../../utils/dates';

/**
 * ReviewCard — renders a single Google Business Profile review.
 *
 * @param {{ review: { author?: string, text?: string, rating?: number, date?: string } }} props
 * @returns {JSX.Element}
 */
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

export { ReviewCard };
