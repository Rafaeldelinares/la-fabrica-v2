import { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Workspace from './components/layout/Workspace';
import CoincidenceCard from './components/business/CoincidenceCard';
import AuditReport from './components/business/AuditReport';
import { ContactModal } from './components/modals/ContactModal';
import { ATSModal } from './components/modals/ATSModal';
import { LegalModal } from './components/modals/LegalModal';
import { performSearch, preloadItem } from './services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [listData, setListData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isPremium, setIsPremium] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Modals state
    const [showContactModal, setShowContactModal] = useState(false);
    const [showATSModal, setShowATSModal] = useState(false);
    const [showLegalModal, setShowLegalModal] = useState(false);

    // Cookie banner state
    const [showCookies, setShowCookies] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('cookiesAccepted')) {
            setShowCookies(true);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('cookiesAccepted', 'true');
        setShowCookies(false);
    };

    const handleSearch = async (e, forcedQuery = null) => {
        if (e) e.preventDefault();
        const queryToUse = forcedQuery || searchTerm;
        if (!queryToUse.trim()) return;

        setLoading(true);
        setError(null);
        setAnalysis(null);
        if (!forcedQuery) {
            setListData(null);
            setCurrentPage(1);
        }

        try {
            // Registrar en el historial de búsqueda
            const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            const newEntry = { query: queryToUse, location, timestamp: new Date().toISOString() };
            localStorage.setItem('searchHistory', JSON.stringify([newEntry, ...history].slice(0, 5)));

            const data = await performSearch(queryToUse, location, isPremium, false);

            if (data.type === 'list') {
                setAnalysis(data);
                setListData(data);
                // Precarga inteligente de top 3
                if (data.items && data.items.length > 0) {
                    const topItems = data.items.slice(0, 3);
                    topItems.forEach(item => preloadItem(item.name));
                }
            } else if (data.type === 'detail') {
                setAnalysis(data);
            } else {
                setError("No se encontraron resultados");
            }
        } catch (err) {
            setError(err.message || "Fallo de conexión con el motor IA");
        } finally {
            setLoading(false);
        }
    };

    const restart = () => {
        setAnalysis(null);
        setSearchTerm('');
        setLocation('');
        setError(null);
    };

    return (
        <div className="h-screen flex flex-col transition-colors duration-500 bg-slate-50 overflow-hidden">
            <Header onHome={restart} onContact={() => setShowContactModal(true)} />

            {analysis && analysis.cached && (
                <div className="bg-yellow-400 text-slate-900 text-[10px] font-black uppercase tracking-widest text-center py-1">
                    Datos Servidos Desde Caché IA
                </div>
            )}

            {analysis && analysis.response_time && (
                <div className="fixed bottom-4 left-4 z-40 bg-white shadow-lg border border-slate-100 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-400">
                    Tiempo IA: {analysis.response_time}s
                </div>
            )}

            <Workspace
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                location={location}
                setLocation={setLocation}
                loading={loading}
                isPremium={isPremium}
                setIsPremium={setIsPremium}
                onSearch={handleSearch}
                error={error}
            >
                {/* LISTA */}
                {analysis && !loading && analysis.type === 'list' && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 pb-4">
                            {analysis.items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, idx) => (
                                <CoincidenceCard
                                    key={idx}
                                    item={item}
                                    onClick={() => handleSearch(null, item.name)}
                                />
                            ))}
                        </div>

                        {analysis.items.length > itemsPerPage && (
                            <div className="flex-none flex items-center justify-center gap-4 mt-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                    Página {currentPage} de {Math.ceil(analysis.items.length / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(analysis.items.length / itemsPerPage), p + 1))}
                                    disabled={currentPage === Math.ceil(analysis.items.length / itemsPerPage)}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* DETALLE */}
                {analysis && !loading && analysis.type === 'detail' && (
                    <AuditReport
                        analysis={analysis.data}
                        onContact={() => setShowContactModal(true)}
                        onBack={listData ? () => setAnalysis(listData) : null}
                    />
                )}
            </Workspace>

            <Footer
                onContact={() => setShowContactModal(true)}
                onATS={() => setShowATSModal(true)}
                onLegal={() => setShowLegalModal(true)}
            />

            {/* Modals */}
            <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
            <ATSModal isOpen={showATSModal} onClose={() => setShowATSModal(false)} />
            <LegalModal isOpen={showLegalModal} onClose={() => setShowLegalModal(false)} />

            {/* Cookies Banner */}
            {showCookies && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
                    <div className="max-w-7xl mx-auto bg-slate-900 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-8">
                        <p className="text-white text-sm font-medium">
                            Utilizamos cookies para garantizar la mejor experiencia. Nuestro motor de IA almacena temporalmente los datos para mejorar la velocidad.
                        </p>
                        <button
                            onClick={acceptCookies}
                            className="bg-white text-slate-900 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shrink-0 whitespace-nowrap"
                        >
                            Aceptar Cookies
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
