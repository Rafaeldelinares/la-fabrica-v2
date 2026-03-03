export default function StarDistribution({ breakdown, totalReviews }) {
    if (!breakdown) return null;

    // Convert breakdown object to array mapped to 5..1
    const stars = [
        { label: '5★', count: breakdown['5'] || 0 },
        { label: '4★', count: breakdown['4'] || 0 },
        { label: '3★', count: breakdown['3'] || 0 },
        { label: '2★', count: breakdown['2'] || 0 },
        { label: '1★', count: breakdown['1'] || 0 },
    ];

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6">
                Distribución de Impacto
            </h3>

            <div className="space-y-4 flex-1 flex flex-col justify-center">
                {stars.map((star) => {
                    const percentage = totalReviews > 0 ? (star.count / totalReviews) * 100 : 0;
                    return (
                        <div key={star.label} className="flex items-center gap-4 text-sm font-bold">
                            <span className="w-6 text-slate-400 shrink-0">{star.label}</span>
                            <div className="progress-bar-container flex-1 bg-slate-50 h-3">
                                <div
                                    className="progress-bar-fill bg-yellow-400 h-full"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <span className="w-8 text-right text-slate-900 shrink-0">{star.count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
