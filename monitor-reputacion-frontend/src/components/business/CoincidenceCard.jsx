import { Star } from 'lucide-react';

export default function CoincidenceCard({ item, onClick }) {
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-[32px] p-6 border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 hover:bg-blue-50/30 hover:-translate-y-2 transition-all duration-300 cursor-pointer group flex flex-col h-full ring-4 ring-transparent hover:ring-blue-100"
        >
            <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                {item.name}
            </h3>

            <div className="flex items-center gap-2 mt-3">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-lg font-bold text-slate-900">{item.rating}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ({item.reviews} reseñas)
                </span>
            </div>

            <p className="text-sm font-medium text-slate-500 mt-4 line-clamp-2 pb-4">
                {item.address}
            </p>

            <div className="mt-auto">
                <button className="w-full bg-slate-50 group-hover:bg-blue-600 text-slate-500 group-hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                    Auditar Módulo
                </button>
            </div>
        </div>
    );
}
