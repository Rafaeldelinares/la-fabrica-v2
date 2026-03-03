import { MapPin, Phone, Globe, DownloadCloud, ArrowLeft } from 'lucide-react';
import StatsGrid from './StatsGrid';
import StarDistribution from './StarDistribution';
import SentimentModule from './SentimentModule';

export default function AuditReport({ analysis, onContact, onBack }) {
    if (!analysis) return null;

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700 w-full h-full flex flex-col overflow-hidden">
            {onBack && (
                <button
                    onClick={onBack}
                    className="flex shrink-0 items-center justify-center gap-2 self-start bg-slate-200/50 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver a resultados
                </button>
            )}

            <div className="overflow-y-auto no-scrollbar flex-1 space-y-6 pb-6">
                <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
                    <div>
                        <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                            {analysis.name}
                        </h2>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm font-bold text-slate-500">
                            {analysis.address && (
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {analysis.address}
                                </span>
                            )}
                            {analysis.phone && (
                                <span className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    {analysis.phone}
                                </span>
                            )}
                            {analysis.website && (
                                <a
                                    href={analysis.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <Globe className="w-4 h-4" />
                                    Visitar Web
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                        <button
                            onClick={onContact}
                            className="button-primary flex items-center justify-center gap-2 !px-6"
                        >
                            <DownloadCloud className="w-4 h-4" />
                            Exportar PDF Pro
                        </button>
                        {analysis.phone && (
                            <a
                                href={`tel:${analysis.phone.replace(/\s+/g, '')}`}
                                className="px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors text-[10px] font-black uppercase tracking-widest text-center"
                            >
                                Llamar Ahora
                            </a>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto shrink-0">
                    <StatsGrid analysis={{
                        rating: analysis.rating,
                        reviews: analysis.reviews,
                        negative_count: analysis.negative_count
                    }} />
                    <StarDistribution breakdown={analysis.breakdown} totalReviews={analysis.reviews} />
                </div>

                {analysis.sentiment && analysis.sentiment.length > 0 && (
                    <SentimentModule sentiment={analysis.sentiment} />
                )}
            </div>
        </div>
    );
}
