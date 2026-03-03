export default function SentimentModule({ sentiment }) {
    if (!sentiment || !Array.isArray(sentiment) || sentiment.length === 0) return null;

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8">
                Módulo de Sentimiento IA
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {sentiment.map((item, idx) => {
                    // Dynamic color based on score
                    let colorClass = 'bg-blue-600';
                    if (item.score >= 85) colorClass = 'bg-emerald-500';
                    else if (item.score < 60) colorClass = 'bg-red-500';
                    else if (item.score < 75) colorClass = 'bg-yellow-400';

                    return (
                        <div key={idx} className="flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                                    {item.name}
                                </span>
                                <span className="text-lg font-black text-slate-900">
                                    {item.score}%
                                </span>
                            </div>
                            <div className="progress-bar-container h-2 bg-slate-50">
                                <div
                                    className={`progress-bar-fill h-full ${colorClass}`}
                                    style={{ width: `${item.score}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
