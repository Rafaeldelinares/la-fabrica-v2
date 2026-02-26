import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ArrowLeft, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WEBHOOK_URL = 'https://n8n.ia-bybusiness.online/webhook/chat-web-com';

const Avatar = ({ size = "md" }) => (
    <div className={`rounded-full bg-slate-200 border border-slate-700 overflow-hidden ${size === "sm" ? "h-6 w-6" : "h-16 w-16 mb-4"}`}>
        <svg viewBox="0 0 100 100" className="h-full w-full">
            <circle cx="50" cy="50" r="50" fill="#e2e8f0" />
            <path d="M50 85c-15 0-28-8-35-20 2-10 10-18 20-20 2 3 8 5 15 5s13-2 15-5c10 2 18 10 20 20-7 12-20 20-35 20z" fill="#0f172a" />
            <circle cx="50" cy="40" r="20" fill="#475569" />
            <path d="M30 40c0-11 9-20 20-20s20 9 20 20v10c0 5-4 10-10 10h-20c-6 0-10-5-10-10z" fill="#1e293b" />
            <circle cx="42" cy="38" r="2" fill="white" />
            <circle cx="58" cy="38" r="2" fill="white" />
            <path d="M30 40c0-5 2-15 20-15s20 10 20 15" fill="none" stroke="#2563eb" strokeWidth="4" />
            <rect x="25" y="40" width="8" height="12" rx="4" fill="#2563eb" />
            <rect x="67" y="40" width="8" height="12" rx="4" fill="#2563eb" />
            <path d="M67 48c-5 5-10 8-15 8" fill="none" stroke="#2563eb" strokeWidth="2" />
        </svg>
    </div>
);

const Thinking = () => (
    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-sm border border-slate-800">
        <Avatar size="sm" />
        <div className="flex gap-1 items-end h-4">
            {[0, 1, 2].map(i => (
                <motion.div key={i} animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }} className="w-1 bg-[#2563eb]" />
            ))}
            <span className="text-[10px] text-slate-400 ml-2">Entendiendo tu pregunta...</span>
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
    const [sessionId] = useState(() => crypto.randomUUID());
    const scrollRef = useRef(null);

    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isTyping]);

    const addMsg = (text, type = 'agent') => setMessages(p => [...p, { id: Date.now(), text, type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    const simulate = (text, delay = 1200) => { setIsTyping(true); setTimeout(() => { setIsTyping(false); addMsg(text); }, delay); };

    const handleOption = (id, label) => {
        addMsg(label, 'user'); setFlow(id); setStep(1);
        if (id === 'NEW') simulate("¡Bienvenido! ¿Cómo te llamas?");
        if (id === 'APPOINTMENT') simulate("Perfecto. ¿Qué día te vendría mejor?");
        if (id === 'WORK') simulate("¡Genial! ¿En qué área tienes experiencia?");
    };

    const handleSend = async () => {
        if (!input.trim() || isSending) return;
        const text = input; setInput(''); addMsg(text, 'user');
        if (step === 1) { setStep(2); simulate(flow === 'NEW' ? `Encantado, ${text}. ¿Qué productos te interesan?` : flow === 'APPOINTMENT' ? "Entendido. Tu email para confirmación:" : "Necesitamos tu teléfono para RRHH:"); }
        else if (step === 2) { if (flow === 'WORK') finish(text); else { simulate("Solo un paso más: ¿tu teléfono?"); setStep(3); } }
        else if (step === 3) finish(text);
    };

    const finish = async (phone) => {
        setIsSending(true);
        try {
            await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, flow, session_id: sessionId, page: 'escaparate.com' }) });
            simulate("✅ ¡Guardado! Recibirás un WhatsApp pronto."); setStep(100);
        } catch (e) { simulate("Error. Inténtalo de nuevo."); }
        setIsSending(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-inter">
            <AnimatePresence>
                {!isOpen && <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setIsOpen(true)} className="bg-[#25d366] p-4 rounded-full shadow-2xl relative"><MessageCircle className="h-8 w-8 text-white" /><div className="absolute inset-0 animate-ping rounded-full bg-[#25d366]/40" /></motion.button>}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex h-[580px] w-[360px] flex-col overflow-hidden rounded-sm bg-slate-950 border border-slate-800 shadow-2xl">
                        <div className="flex items-center justify-between bg-slate-900/90 px-4 py-3 border-b border-slate-800 text-white">
                            <div className="flex items-center gap-3"><ArrowLeft className="h-5 w-5 opacity-50 cursor-pointer" onClick={() => setIsOpen(false)} /><Avatar size="sm" /><div><h3 className="text-sm font-bold">Asistente Virtual</h3><p className="text-[10px] text-emerald-400">● en línea</p></div></div>
                            <X className="h-5 w-5 opacity-50 cursor-pointer" onClick={() => setIsOpen(false)} />
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 relative" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)', backgroundSize: '30px 30px' }}>
                            {!isVerified ? (
                                <div className="h-full flex flex-col justify-center items-center text-center"><Avatar /><h4 className="text-white font-bold mb-2">Verificación de Edad</h4><p className="text-slate-400 text-xs mb-6 px-4">Debes ser mayor de 18 años para acceder al asistente de Escaparate.com</p><button onClick={() => { setIsVerified(true); simulate("¡Hola! 👋 Soy tu asistente. ¿Cómo puedo ayudarte?"); }} className="bg-[#D00000] text-white px-8 py-2 rounded-sm font-bold hover:bg-red-700">SOY MAYOR DE EDAD</button></div>
                            ) : (
                                <>{messages.map(m => (
                                    <div key={m.id} className={`flex gap-2 ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {m.type === 'agent' && <Avatar size="sm" />}
                                        <div className={`max-w-[75%] rounded-sm px-3 py-2 text-xs ${m.type === 'user' ? 'bg-[#D00000] text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'}`}><p>{m.text}</p><div className="text-[8px] opacity-40 mt-1 text-right">{m.time}</div></div>
                                    </div>
                                ))}{isTyping && <Thinking />}{!flow && !isTyping && (
                                    <div className="grid gap-2 pt-2">
                                        {['NEW', 'APPOINTMENT', 'WORK'].map((id, i) => (
                                            <button key={id} onClick={() => handleOption(id, id === 'NEW' ? 'Cliente nuevo' : id === 'APPOINTMENT' ? 'Cita' : 'Trabajar')} className="text-left p-3 text-xs bg-slate-900 border border-slate-800 text-white rounded-sm hover:border-emerald-500 transition-colors uppercase font-bold tracking-tight">{['💰 Cliente nuevo', '📅 Pedir cita', '💼 Trabajar aquí'][i]}</button>
                                        ))}
                                    </div>
                                )}
                                </>
                            )}
                        </div>

                        <div className="bg-slate-900/90 p-3 border-t border-slate-800 flex gap-2">
                            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={!isVerified || step === 100} placeholder="Escribe aquí..." className="flex-1 bg-slate-950 border border-slate-800 text-white px-4 py-2 text-xs rounded-sm outline-none" />
                            <button onClick={handleSend} disabled={!input.trim() || isSending} className="bg-[#D00000] p-2 rounded-sm text-white disabled:opacity-30"><Send className="h-4 w-4" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WhatsAppAssistant;
