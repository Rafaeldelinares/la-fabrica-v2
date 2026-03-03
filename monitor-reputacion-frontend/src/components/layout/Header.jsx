import { Brain, UserPlus } from 'lucide-react';

export default function Header({ onHome, onContact }) {
    return (
        <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm shrink-0">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
                <button
                    onClick={onHome}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                    <div className="bg-blue-600 p-2 rounded-xl text-white">
                        <Brain className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="font-black text-slate-900 tracking-tighter leading-none text-lg uppercase">
                            ByBusiness
                        </span>
                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none mt-1">
                            Monitor IA
                        </span>
                    </div>
                </button>

                <button
                    onClick={onContact}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    Contacto Pro
                </button>
            </div>
        </header>
    );
}
