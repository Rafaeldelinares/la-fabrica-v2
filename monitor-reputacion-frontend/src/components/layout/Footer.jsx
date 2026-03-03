export default function Footer({ onContact, onATS, onLegal }) {
    return (
        <footer className="bg-white border-t border-slate-100 py-4 lg:py-6 mt-auto shrink-0 relative z-50">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm font-bold text-slate-400">
                    © {new Date().getFullYear()} ByBusiness
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={onContact}
                        className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        Contacto
                    </button>
                    <button
                        onClick={onATS}
                        className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        Trabaja con Nosotros
                    </button>
                    <button
                        onClick={onLegal}
                        className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        Aviso Legal
                    </button>
                </div>
            </div>
        </footer>
    );
}
