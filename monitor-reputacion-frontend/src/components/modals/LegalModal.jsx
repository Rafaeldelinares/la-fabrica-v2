import { X } from 'lucide-react';

export function LegalModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-2xl p-8 relative animate-in slide-in-from-bottom-8 flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full transition-colors z-10">
                    <X className="w-5 h-5" />
                </button>
                <div className="mb-6 shrink-0">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Aviso Legal</h2>
                </div>
                <div className="overflow-y-auto pr-4 text-sm text-slate-600 space-y-4 font-medium flex-1">
                    <p><strong>1. Identidad del titular de la presente web</strong></p>
                    <p>En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico, le informamos que el titular de ByBusiness es una entidad ficticia para fines demostrativos.</p>
                    <p><strong>2. Condiciones generales de uso de este sitio web</strong></p>
                    <p>El acceso a esta web, así como el uso de la información que contiene, es de la exclusiva responsabilidad del usuario. La empresa no será responsable, directa ni indirectamente, de los daños y perjuicios de cualquier naturaleza que pudieran derivarse del uso de este sitio web ni de sus utilidades.</p>
                    <p><strong>3. Privacidad y Protección de Datos</strong></p>
                    <p>Los datos obtenidos de fuentes públicas y presentados en esta web tienen fines meramente informativos. La información procesada sobre otras entidades comerciales o negocios ha sido recopilada de dominios públicos bajo las directrices de OSINT (Open Source Intelligence).</p>
                    <p><strong>4. Propiedad intelectual e industrial</strong></p>
                    <p>Todos los componentes del sistema, así como la estética y el código generado, son propiedad de ByBusiness. Queda totalmente prohibida la reproducción total o parcial sin el consentimiento expreso.</p>
                </div>
            </div>
        </div>
    );
}
