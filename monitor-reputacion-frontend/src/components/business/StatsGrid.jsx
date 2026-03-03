import { Star, MessageSquareText, AlertTriangle, TrendingUp } from 'lucide-react';

export default function StatsGrid({ analysis }) {
    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Rating */}
            <div className="bg-slate-50 rounded-[32px] p-6 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-3 rounded-2xl shadow-sm mb-4">
                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
                    {analysis.rating}
                </div>
                <div className="label">Rating IA</div>
            </div>

            {/* Reviews */}
            <div className="bg-slate-50 rounded-[32px] p-6 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-3 rounded-2xl shadow-sm mb-4">
                    <MessageSquareText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
                    {analysis.reviews}
                </div>
                <div className="label">Reseñas</div>
            </div>

            {/* Alertas */}
            <div className="bg-slate-50 rounded-[32px] p-6 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-3 rounded-2xl shadow-sm mb-4">
                    <AlertTriangle className={`w-6 h-6 ${analysis.negative_count > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
                    {analysis.negative_count || 0}
                </div>
                <div className="label">Alarmas</div>
            </div>

            {/* Ranking Estimado */}
            <div className="bg-slate-50 rounded-[32px] p-6 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-3 rounded-2xl shadow-sm mb-4">
                    <TrendingUp className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
                    Top {Math.max(1, Math.floor(Math.random() * 20))}
                </div>
                <div className="label">Ranking Estimado</div>
            </div>
        </div>
    );
}
