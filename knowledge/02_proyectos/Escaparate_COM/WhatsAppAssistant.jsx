import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ArrowLeft, MoreVertical, CheckCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WEBHOOK_URL = 'https://n8n.ia-bybusiness.online/webhook/chat-web-com';

const WhatsAppAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [messages, setMessages] = useState([]);
    const [flow, setFlow] = useState(null);
    const [step, setStep] = useState(0);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sessionId] = useState(() => crypto.randomUUID());
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isTyping]);

    const addMsg = (text, type = 'agent') => setMessages(p => [...p, { id: Date.now(), text, type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

    const simulate = (text, delay = 1000) => {
        setIsTyping(true);
        setTimeout(() => { setIsTyping(false); addMsg(text); }, delay);
    };

    const startChat = () => {
        setIsOpen(true);
        if (!isVerified) return;
        if (messages.length === 0) simulate("¡Hola! 👋 Soy tu asistente IA de Escaparate.com. ¿En qué puedo ayudarte hoy?");
    };

    const handleOption = (id, label) => {
        addMsg(label, 'user');
        setFlow(id);
        setStep(1);
        if (id === 'NEW') simulate("¡Bienvenido! Es un placer. ¿Cómo te llamas?");
        if (id === 'APPOINTMENT') simulate("Perfecto, agendemos una cita. ¿Qué día te vendría mejor?");
        if (id === 'WORK') simulate("¡Genial! Siempre buscamos talento. ¿En qué área tienes experiencia?");
    };

    const handleSend = async () => {
        if (!input.trim() || isSending) return;
        const text = input; setInput(''); addMsg(text, 'user');

        if (step === 1) {
            setStep(2);
            if (flow === 'NEW') simulate(`Encantado, ${text}. ¿Qué productos te interesan?`);
            if (flow === 'APPOINTMENT') simulate("Entendido. Por favor, indícame tu email para enviarte la confirmación.");
            if (flow === 'WORK') simulate("Interesante. Por último, necesitamos tu teléfono para que el equipo de RRHH te contacte.");
        } else if (step === 2) {
            if (flow === 'NEW') { simulate("¡Vale! Para darte el mejor precio, ¿me dejas tu teléfono?"); setStep(3); }
            if (flow === 'APPOINTMENT') { simulate("Solo queda un paso: ¿cuál es tu teléfono?"); setStep(3); }
            if (flow === 'WORK') finish(text);
        } else if (step === 3) {
            finish(text);
        }
    };

    const finish = async (phone) => {
        setIsSending(true);
        try {
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, flow, session_id: sessionId, page: 'escaparate.com' })
            });
            simulate("✅ ¡Hecho! Tus datos se han guardado. Recibirás un mensaje de confirmación por WhatsApp en unos segundos.");
            setStep(100);
        } catch (e) { simulate("Vaya, hubo un error. Inténtalo de nuevo."); }
        setIsSending(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-inter">
            <AnimatePresence>
                {!isOpen && (
                    <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={startChat} className="bg-[#25d366] p-4 rounded-full shadow-2xl relative transition-transform hover:scale-110">
                        <MessageCircle className="h-8 w-8 text-white" />
                        <div className="absolute inset-0 animate-ping rounded-full bg-[#25d366]/40"></div>
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex h-[580px] w-[360px] flex-col overflow-hidden rounded-sm bg-slate-950 border border-slate-800 shadow-2xl shadow-indigo-500/10">
                        <div className="flex items-center justify-between bg-slate-900/90 px-4 py-3 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <ArrowLeft className="h-5 w-5 text-slate-400 cursor-pointer" onClick={() => setIsOpen(false)} />
                                <div className="h-8 w-8 rounded-full bg-[#D00000] flex items-center justify-center font-bold text-white text-xs">E</div>
                                <div><h3 className="text-sm font-bold text-white">Escaparate Assistant</h3><p className="text-[10px] text-emerald-400">● en línea</p></div>
                            </div>
                            <X className="h-5 w-5 text-slate-400 cursor-pointer" onClick={() => setIsOpen(false)} />
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 relative" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                            {!isVerified ? (
                                <div className="h-full flex flex-col justify-center items-center text-center p-4">
                                    <h4 className="text-white font-bold mb-4">Verificación de Edad</h4>
                                    <p className="text-slate-400 text-xs mb-6">Debes ser mayor de 18 años para usar este servicio de asistencia.</p>
                                    <button onClick={() => { setIsVerified(true); simulate("¡Verificado! ¿En qué puedo ayudarte hoy?"); }} className="bg-[#D00000] text-white px-8 py-2 rounded-sm font-bold transition-all hover:bg-red-700">SOY MAYOR DE EDAD</button>
                                </div>
                            ) : (
                                <>
                                    {messages.map(m => (
                                        <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-sm px-3 py-2 text-xs shadow-md ${m.type === 'user' ? 'bg-[#D00000] text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'}`}>
                                                <p>{m.text}</p><div className="text-[9px] opacity-50 mt-1 text-right">{m.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && <div className="text-emerald-400 text-[10px] animate-pulse">Escribiendo...</div>}
                                    {!flow && !isTyping && (
                                        <div className="grid gap-2 pt-2">
                                            <button onClick={() => handleOption('NEW', 'Soy cliente nuevo')} className="text-left p-3 text-xs bg-slate-900 border border-slate-800 text-white rounded-sm hover:border-emerald-500 transition-colors">💰 Soy cliente nuevo</button>
                                            <button onClick={() => handleOption('APPOINTMENT', 'Quiero una cita')} className="text-left p-3 text-xs bg-slate-900 border border-slate-800 text-white rounded-sm hover:border-emerald-500 transition-colors">📅 Quiero una cita</button>
                                            <button onClick={() => handleOption('WORK', 'Quiero trabajar con ustedes')} className="text-left p-3 text-xs bg-slate-900 border border-slate-800 text-white rounded-sm hover:border-emerald-500 transition-colors">💼 Quiero trabajar con ustedes</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="bg-slate-900/90 p-3 border-t border-slate-800">
                            <div className="flex gap-2">
                                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={!isVerified || step === 100} placeholder="Escribe aquí..." className="flex-1 bg-slate-950 border border-slate-800 text-white px-4 py-2 text-xs rounded-sm focus:border-[#D00000] outline-none" />
                                <button onClick={handleSend} disabled={!input.trim() || isSending} className="bg-[#D00000] p-2 rounded-sm text-white disabled:opacity-50 transition-transform active:scale-95"><Send className="h-4 w-4" /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WhatsAppAssistant;
