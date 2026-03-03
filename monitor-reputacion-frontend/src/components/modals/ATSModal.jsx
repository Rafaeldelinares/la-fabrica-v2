import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { webhookService } from '../../services/webhookService';

export function ATSModal({ isOpen, onClose }) {
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [formData, setFormData] = useState({ nombre: '', email: '', linkedin: '', carta: '' });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        try {
            await webhookService.submitATSForm(formData);
            setStatus('success');
            setTimeout(() => {
                onClose();
                setStatus('idle');
                setFormData({ nombre: '', email: '', linkedin: '', carta: '' });
            }, 2500);
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-lg p-8 relative animate-in slide-in-from-bottom-8">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Trabaja con Nosotros (ATS)</h2>
                    <p className="text-sm text-slate-500 mt-2">Envíanos tu currículum para futuras vacantes.</p>
                </div>


                {status === 'success' ? (
                    <div className="py-12 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Send className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">¡Candidatura Enviada!</h3>
                        <p className="text-slate-500">Hemos recibido tu perfil profesional. Lo revisaremos detalladamente.</p>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="label block mb-2">Nombre Completo</label>
                            <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" disabled={status === 'loading'} />
                        </div>
                        <div>
                            <label className="label block mb-2">Email</label>
                            <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" disabled={status === 'loading'} />
                        </div>
                        <div>
                            <label className="label block mb-2">Perfil de LinkedIn / Portfolio</label>
                            <input type="url" value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" disabled={status === 'loading'} />
                        </div>
                        <div>
                            <label className="label block mb-2">Carta de Presentación (Breve)</label>
                            <textarea rows="3" value={formData.carta} onChange={e => setFormData({ ...formData, carta: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none" disabled={status === 'loading'}></textarea>
                        </div>

                        {status === 'error' && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 mt-4">
                                Hubo un error al enviar la candidatura. Por favor, inténtalo de nuevo.
                            </div>
                        )}

                        <button type="submit" disabled={status === 'loading'} className="button-primary w-full mt-6 flex justify-center items-center gap-2">
                            {status === 'loading' ? (
                                <span className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Enviar Candidatura
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
