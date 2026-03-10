import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ArrowLeft, MoreVertical, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WEBHOOK_URL = 'https://n8n.ia-bybusiness.online/webhook/chat-web-com';

const Avatar = ({ size = "md" }) => (
    <div className={`rounded-full overflow-hidden flex-shrink-0 ${size === "sm" ? "h-6 w-6" : "h-16 w-16 mb-4"}`}>
        <img src="/asistente_virtual.png" alt="Asistente IA" className="h-full w-full object-cover" />
    </div>
);

const Thinking = () => (
    <div className="flex justify-start my-2">
        <div className="relative max-w-[85%] rounded-lg px-3 py-3 text-sm shadow-sm rounded-tl-none bg-white">
            <div className="absolute top-0 h-0 w-0 border-[6px] border-transparent right-full border-r-transparent" style={{ borderTopColor: '#ffffff', borderRightColor: '#ffffff' }} />
            <div className="flex items-center gap-3">
                <Avatar size="sm" />
                <div className="flex gap-1 items-end h-4">
                    {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }} className="w-1 bg-[#128C7E]" />
                    ))}
                    <span className="text-[10px] text-slate-400 ml-2">Escribiendo...</span>
                </div>
            </div>
        </div>
    </div>
);

const WhatsAppAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [messages, setMessages] = useState([]);
    const [flow, setFlow] = useState(null);
    const [step, setStep] = useState(0);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [userData, setUserData] = useState({});
    const [cvData, setCvData] = useState(null);
    const [sessionId] = useState(() => crypto.randomUUID());
    const scrollRef = useRef(null);

    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isTyping]);

    const addMsg = (text, type = 'agent') => setMessages(p => [...p, { id: Date.now() + Math.random(), text, type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    const simulate = (text, delay = 1200) => { setIsTyping(true); setTimeout(() => { setIsTyping(false); addMsg(text); }, delay); };

    const handleOption = (id, label) => {
        addMsg(label, 'user'); setFlow(id); setStep(1);
        if (id === 'NEW') simulate("¡Bienvenido! Soy Rosa María 👋 ¿Cómo te llamas?");
        if (id === 'APPOINTMENT') simulate("¡Hola! Soy Rosa María 👋 ¿Cómo te llamas?");
        if (id === 'WORK') simulate("¡Genial! Soy Rosa María 👋 ¿Cómo te llamas?");
    };

    const handleSend = async () => {
        if (!input.trim() || isSending) return;
        const text = input; setInput(''); addMsg(text, 'user');
        if (flow === 'NEW') {
            if (step === 1) { setUserData(p => ({ ...p, nombre: text })); setStep(2); simulate(`Encantado, ${text}. ¿Qué productos o servicios te interesan?`); }
            else if (step === 2) { setUserData(p => ({ ...p, intereses: text })); setStep(3); simulate("¿En qué ciudad está tu negocio?"); }
            else if (step === 3) { setUserData(p => ({ ...p, localidad: text })); setStep(4); simulate("¿Tu email de contacto? (para enviarte el resumen)"); }
            else if (step === 4) { setUserData(p => ({ ...p, email: text })); setStep(5); simulate("Por último, ¿tu teléfono móvil?"); }
            else if (step === 5) { finish({ ...userData, phone: text }); }
        } else if (flow === 'APPOINTMENT') {
            if (step === 1) { setUserData(p => ({ ...p, nombre: text })); setStep(2); simulate(`Perfecto, ${text}. ¿Qué día te vendría mejor?`); }
            else if (step === 2) { setUserData(p => ({ ...p, day: text })); setStep(3); simulate("Entendido. Tu email para confirmación:"); }
            else if (step === 3) { setUserData(p => ({ ...p, email: text })); setStep(4); simulate("Último paso: ¿tu teléfono?"); }
            else if (step === 4) { finish({ ...userData, phone: text }); }
        } else if (flow === 'WORK') {
            if (step === 1) { setUserData(p => ({ ...p, nombre: text })); setStep(2); simulate(`Encantado, ${text}. ¿En qué área tienes experiencia?`); }
            else if (step === 2) { setUserData(p => ({ ...p, area: text })); setStep(3); simulate("¿Tu email de contacto?"); }
            else if (step === 3) { setUserData(p => ({ ...p, email: text })); setStep(4); simulate("¿Tu teléfono móvil? Carlos de RRHH te escribirá por WhatsApp 📱"); }
            else if (step === 4) { setUserData(p => ({ ...p, phone: text })); setStep(5); simulate("¿Quieres adjuntar tu CV? Acepto PDF o DOC 📎"); }
        }
    };

    const handleCVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        addMsg(`📎 ${file.name}`, 'user');
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });
        setCvData({ filename: file.name, base64 });
        finish({ ...userData, cv_filename: file.name, cv_base64: base64 });
    };

    const handleCVSkip = () => {
        addMsg('Continuar sin CV', 'user');
        finish({ ...userData });
    };

    const finish = async (data) => {
        setIsSending(true);
        try {
            const payload = { ...data, flow, session_id: sessionId, page: 'ia-bybusiness.com' };
            await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (flow === 'WORK') {
                simulate(data.cv_filename
                    ? `✅ ¡Perfecto! Candidatura y CV registrados. Carlos te va a escribir ahora por WhatsApp para continuar la entrevista 📱`
                    : `✅ ¡Perfecto! Candidatura registrada. Carlos te va a escribir ahora por WhatsApp para continuar la entrevista 📱\n\n📎 También puedes enviarnos tu CV a: rrhh@ia-bybusiness.com`);
            } else {
                simulate("✅ ¡Perfecto! En un momento recibirás un WhatsApp y un email con toda la información. 🚀");
            }
            setStep(100);
        } catch (e) { simulate("Error. Inténtalo de nuevo."); }
        setIsSending(false);
    };

    return (
        <div className="fixed bottom-24 lg:bottom-6 right-6 z-[9999] font-sans">
            <AnimatePresence>
                {!isOpen && (
                    <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setIsOpen(true)} className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366] text-white shadow-2xl transition-all hover:scale-110 active:scale-95">
                        <MessageCircle className="h-8 w-8 text-white relative z-10" />
                        <div className="absolute inset-0 animate-ping rounded-full bg-[#25d366]/40 pointer-events-none" />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex h-[600px] w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: '#00a884' }}>
                            <div className="flex items-center gap-3">
                                <ArrowLeft className="h-5 w-5 opacity-80 cursor-pointer hover:opacity-100" onClick={() => setIsOpen(false)} />
                                <Avatar size="sm" />
                                <div>
                                    <h3 className="text-sm font-bold">Rosa María</h3>
                                    <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
                                        en línea
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <MoreVertical className="h-5 w-5 opacity-80 cursor-pointer" />
                                <X className="h-5 w-5 opacity-80 cursor-pointer hover:opacity-100" onClick={() => setIsOpen(false)} />
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 relative" style={{ backgroundColor: '#efe7dd', backgroundImage: 'url("https://wweb.dev/assets/whatsapp-chat-wallpaper.png")', backgroundSize: '400px', backgroundBlendMode: 'overlay' }}>
                            {!isVerified ? (
                                <div className="h-full flex flex-col justify-center items-center text-center bg-white/80 p-6 rounded-2xl backdrop-blur-sm m-auto max-w-[90%] shadow-lg">
                                    <Avatar />
                                    <h4 className="text-slate-800 font-bold mb-2">Verificación de Edad</h4>
                                    <p className="text-slate-500 text-sm mb-6">Debes ser mayor de 18 años para acceder al asistente de IA-ByBusiness</p>
                                    <button onClick={() => { setIsVerified(true); simulate("¡Hola! 👋 Soy Rosa María, asistente de IA-ByBusiness. ¿Cómo puedo ayudarte?"); }} className="bg-[#2563eb] text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 w-full transition-colors shadow-md">SOY MAYOR DE EDAD</button>
                                </div>
                            ) : (
                                <>{messages.map(m => (
                                    <div key={m.id} className={`flex w-full my-2 ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`relative max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${m.type === 'user' ? 'rounded-tr-none bg-[#dcf8c6]' : 'rounded-tl-none bg-white'}`}>
                                            <div className={`absolute top-0 h-0 w-0 border-[6px] border-transparent ${m.type === 'user' ? 'left-full border-l-transparent' : 'right-full border-r-transparent'}`} style={{ borderTopColor: m.type === 'user' ? '#dcf8c6' : '#ffffff', [m.type === 'user' ? 'borderLeftColor' : 'borderRightColor']: m.type === 'user' ? '#dcf8c6' : '#ffffff', marginLeft: m.type === 'user' ? '-6px' : '0', marginRight: m.type === 'user' ? '0' : '-6px' }} />
                                            {m.type === 'agent' && <div className="flex items-center gap-1 mb-1 opacity-60"><Avatar size="sm" /> <span className="text-[10px] font-bold text-slate-500">Asistente IA</span></div>}
                                            <p className="text-slate-800 whitespace-pre-wrap">{m.text}</p>
                                            <div className="mt-1 flex items-center justify-end gap-1">
                                                <div className="text-[10px] text-slate-400">{m.time}</div>
                                                {m.type === 'user' && <CheckCheck className="h-3 w-3 text-blue-400" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}{isTyping && <Thinking />}{!flow && !isTyping && (
                                    <div className="grid gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2">
                                        {['NEW', 'APPOINTMENT', 'WORK'].map((id, i) => (
                                            <button key={id} onClick={() => handleOption(id, id === 'NEW' ? 'Cliente nuevo' : id === 'APPOINTMENT' ? 'Cita' : 'Trabajar')} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white/90 p-3 text-sm font-medium text-emerald-800 backdrop-blur-sm transition-all hover:bg-emerald-50 hover:shadow-md uppercase tracking-tight shadow-sm text-left">{['💰 Cliente nuevo', '📅 Pedir cita', '💼 Trabajar aquí'][i]}</button>
                                        ))}
                                    </div>
                                )}{flow === 'WORK' && step === 5 && !isTyping && (
                                    <div className="grid gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2">
                                        <label className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white/90 p-3 text-sm font-medium text-emerald-800 backdrop-blur-sm transition-all hover:bg-emerald-50 hover:shadow-md cursor-pointer shadow-sm">
                                            <input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="hidden" />
                                            📎 Adjuntar CV (PDF / DOC)
                                        </label>
                                        <button onClick={handleCVSkip} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 p-3 text-sm font-medium text-slate-600 backdrop-blur-sm transition-all hover:bg-slate-50 hover:shadow-md shadow-sm">
                                            Continuar sin CV →
                                        </button>
                                    </div>
                                )}
                                </>
                            )}
                        </div>

                        <div className="bg-[#f0f2f5] p-3 border-t border-slate-200 flex gap-2">
                            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={!isVerified || step === 100 || (flow === 'WORK' && step === 5)} placeholder="Escribe un mensaje..." className="flex-1 rounded-lg bg-white px-4 py-2 text-sm outline-none placeholder:text-slate-400 disabled:opacity-50" />
                            <button onClick={handleSend} disabled={!input.trim() || isSending} className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-all ${(!input.trim() || isSending) ? 'bg-slate-300' : 'bg-[#00a884] hover:scale-105 active:scale-95'}`}><Send className="h-5 w-5" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WhatsAppAssistant;
