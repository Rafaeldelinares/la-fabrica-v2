import { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { webhookService } from '../../services/webhookService';

export function ContactModal({ isOpen, onClose }) {
    const [captcha, setCaptcha] = useState({ a: 0, b: 0, answer: '' });
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', mensaje: '' });

    useEffect(() => {
        if (isOpen) {
            setCaptcha({
                a: Math.floor(Math.random() * 10),
                b: Math.floor(Math.random() * 10),
                answer: ''
            });
            setStatus('idle');
            setFormData({ nombre: '', telefono: '', email: '', mensaje: '' });
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (parseInt(captcha.answer) !== (captcha.a + captcha.b)) return;

        setStatus('loading');
        try {
            await webhookService.submitContactForm(formData);
            setStatus('success');
            setTimeout(() => {
                onClose();
                setStatus('idle');
            }, 2500);
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-lg p-8 relative animate-in slide-in-from-bottom-8">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                        Contacto Pro
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                        Solicita un informe detallado o contacta con nuestro equipo experto.
                    </p>
                </div>



                {status === 'success' ? (
                    <div className="py-12 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Send className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">¡Mensaje Enviado!</h3>
                        <p className="text-slate-500">Hemos recibido tu solicitud. Nos pondremos en contacto contigo pronto.</p>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label block mb-2">Nombre</label>
                                <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" disabled={status === 'loading'} />
                            </div>
                            <div>
                                <label className="label block mb-2">Teléfono</label>
                                <input type="tel" required value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" disabled={status === 'loading'} />
                            </div>
                        </div>

                        <div>
                            <label className="label block mb-2">Email</label>
                            <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none" disabled={status === 'loading'} />
                        </div>

                        <div>
                            <label className="label block mb-2">Mensaje</label>
                            <textarea rows="4" required value={formData.mensaje} onChange={e => setFormData({ ...formData, mensaje: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none" disabled={status === 'loading'}></textarea>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <span className="text-sm font-bold text-slate-900">
                                ¿Cuánto es {captcha.a} + {captcha.b}?
                            </span>
                            <input
                                type="text"
                                required
                                value={captcha.answer}
                                onChange={e => setCaptcha({ ...captcha, answer: e.target.value })}
                                className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-2 text-center font-bold"
                                disabled={status === 'loading'}
                            />
                        </div>

                        {status === 'error' && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                                Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo.
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={parseInt(captcha.answer) !== (captcha.a + captcha.b) || status === 'loading'}
                            className="w-full button-primary flex items-center justify-center gap-2 mt-6"
                        >
                            {status === 'loading' ? (
                                <span className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Enviar Mensaje
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
