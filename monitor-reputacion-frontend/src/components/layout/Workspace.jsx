import { Search, MapPin, Loader2, Sparkles } from 'lucide-react';

export default function Workspace({
    searchTerm,
    setSearchTerm,
    location,
    setLocation,
    loading,
    isPremium,
    setIsPremium,
    onSearch,
    error,
    children
}) {
    const isInitialState = !children && !loading && !error;

    return (
        <main className="flex-1 flex flex-col pt-4 md:pt-8 w-full">
            <div className={`transition-all duration-700 w-full px-4 lg:px-8 max-w-7xl mx-auto flex-none ${isInitialState ? 'mt-8 md:mt-16 scale-100 opacity-100' : 'mt-0 scale-95 opacity-90'
                }`}>

                {isInitialState && (
                    <div className="text-center mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4">
                        <h1 className="title text-slate-900 mb-4">
                            Monitor de <span className="text-blue-600">Reputación</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
                            Analiza la presencia digital y reputación de cualquier negocio en segundos usando inteligencia artificial avanzada.
                        </p>
                    </div>
                )}

                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 shadow-xl shadow-slate-200/20 max-w-4xl mx-auto w-full transition-all">
                    <form className="flex flex-col md:flex-row gap-4 items-end relative" onSubmit={e => onSearch(e)}>
                        <div className="flex-1 w-full">
                            <label className="label mb-2 flex items-center gap-2">
                                <Search className="w-3 h-3" /> Tipo de negocio
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="ej: ferreterías"
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm md:text-base focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 font-bold placeholder:font-normal placeholder:text-slate-400"
                                required
                            />
                        </div>

                        <div className="flex-1 w-full relative">
                            <label className="label mb-2 flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Ciudad
                            </label>
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="ej: Málaga"
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm md:text-base focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 font-bold placeholder:font-normal placeholder:text-slate-400"
                            />
                        </div>

                        <div className="w-full md:w-auto flex flex-col items-center justify-between mb-2">
                            <label className="flex items-center gap-2 cursor-pointer mb-5 shrink-0">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={isPremium} onChange={() => setIsPremium(!isPremium)} />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${isPremium ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isPremium ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                                <div className="label !text-[8px] flex items-center gap-1 mt-1 !mb-0">
                                    <Sparkles className="w-3 h-3 text-yellow-400" /> Búsqueda Premium
                                </div>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !searchTerm.trim()}
                            className="button-primary w-full md:w-auto h-12 flex items-center justify-center shrink-0 mb-[2px]"
                        >
                            Auditar Reputación
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm font-bold border border-red-100 max-w-lg mx-auto animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

            </div>

            {!isInitialState && (
                <div className="flex-1 w-full bg-slate-50 mt-6 px-4 lg:px-8 pb-6 md:pb-12 h-full min-h-0 flex flex-col">
                    <div className="max-w-7xl mx-auto h-full w-full flex-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center space-y-6 animate-in fade-in">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-slate-200 rounded-full animate-pulse"></div>
                                    <Loader2 className="w-20 h-20 text-blue-600 animate-spin absolute top-0 left-0" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">
                                        Analizando con IA
                                    </h3>
                                    <p className="text-sm font-bold text-slate-500 max-w-xs mx-auto">
                                        Esto puede tardar unos 10 segundos. No cierres la ventana.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-bottom-8 duration-700 h-full">
                                {children}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
