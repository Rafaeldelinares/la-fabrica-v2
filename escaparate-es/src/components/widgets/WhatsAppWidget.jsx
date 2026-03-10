import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, X, Send, CheckCheck,
  MoreVertical, ArrowLeft, Briefcase, Headset, User, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * WhatsAppWidget — Conectado al AI Agent Sofía V3 (IA-ByBusiness)
 * Endpoint: chatTrigger n8n → POST /webhook/escaparate-chat-v3/chat
 * Sofía gestiona autonomamente: preguntar negocio→ciudad→ejecutar IA-Reputation→captación datos
 */

const WHATSAPP_GREEN = '#00a884';
const WHATSAPP_BG = '#efe7dd';
const USER_BUBBLE = '#dcf8c6';
const AGENT_BUBBLE = '#ffffff';

// Endpoint del AI Agent Sofía V3 (chatTrigger n8n)
// En desarrollo local: el servidor Vite hace de proxy hacia localhost:5678 (sin CORS)
// En producción (ia-bybusiness.com): petición directa al dominio n8n con HTTPS
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SOFIA_ENDPOINT = IS_LOCAL
  ? '/api-n8n/webhook/escaparate-chat-v3/chat'
  : 'https://n8n.ia-bybusiness.online/webhook/escaparate-chat-v3/chat';

// Mensajes de inicio según flujo seleccionado — Sofía se adapta a cada contexto
const FLOW_STARTERS = {
  VENTAS: '¡Hola! Quiero información sobre vuestros servicios, tengo un negocio y me gustaría saber cómo la IA puede ayudarme.',
  SOPORTE: '¡Hola! Soy cliente de ByBusiness y necesito ayuda con mi servicio.',
  RRHH: '¡Hola! Me interesa trabajar como operador de llamadas en ByBusiness.'
};

/**
 * Genera o recupera el sessionId persistente de la sesión de chat.
 * Se preserva durante toda la navegación para mantener la memoria de Sofía.
 */
const getSessionId = () => {
  const key = 'sofia_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
};

/** Animación de "Escribiendo..." de Sofía */
const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="rounded-lg bg-white px-4 py-3 shadow-sm rounded-tl-none flex items-center gap-2">
      <img
        src="https://ui-avatars.com/api/?name=Rosa+Maria&bg=00a884&color=fff&size=24"
        alt="Rosa María"
        className="w-5 h-5 rounded-full"
      />
      <div className="flex gap-1 items-end h-4">
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay }}
            className="w-1.5 h-1.5 rounded-full bg-slate-400 block"
          />
        ))}
        <span className="text-[10px] text-slate-400 ml-1">Rosa María escribe...</span>
      </div>
    </div>
  </div>
);

/** Burbuja de mensaje individual */
const MessageBubble = ({ msg }) => (
  <div className={`flex w-full ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`relative max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${msg.type === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'
        }`}
      style={{ backgroundColor: msg.type === 'user' ? USER_BUBBLE : AGENT_BUBBLE }}
    >
      {/* Avatar de Sofía en mensajes del agente */}
      {msg.type === 'agent' && (
        <div className="flex items-center gap-1 mb-1 opacity-70">
          <img
            src="https://ui-avatars.com/api/?name=Rosa+Maria&bg=00a884&color=fff&size=20"
            alt="Rosa María"
            className="w-4 h-4 rounded-full"
          />
          <span className="text-[10px] font-bold text-slate-500">Rosa María · IA ByBusiness</span>
        </div>
      )}
      <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{msg.text}</p>
      <div className="mt-1 flex items-center justify-end gap-1">
        <span className="text-[10px] text-slate-400">{msg.time}</span>
        {msg.type === 'user' && <CheckCheck className="h-3 w-3 text-blue-400" />}
      </div>
      {/* Triángulo de burbuja */}
      <div
        className={`absolute top-0 h-0 w-0 border-[6px] border-transparent ${msg.type === 'user' ? 'left-full' : 'right-full'
          }`}
        style={{
          borderTopColor: msg.type === 'user' ? USER_BUBBLE : AGENT_BUBBLE,
          [msg.type === 'user' ? 'borderLeftColor' : 'borderRightColor']:
            msg.type === 'user' ? USER_BUBBLE : AGENT_BUBBLE,
          marginLeft: msg.type === 'user' ? '-6px' : '0',
          marginRight: msg.type === 'user' ? '0' : '-6px'
        }}
      />
    </div>
  </div>
);

const WhatsAppWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [flowStarted, setFlowStarted] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId] = useState(getSessionId);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  /** Auto-scroll al último mensaje */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  /** Focus en el input al abrir */
  useEffect(() => {
    if (isOpen && flowStarted && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, flowStarted]);

  const addMessage = useCallback((text, type = 'agent') => {
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        text,
        type,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, []);

  /**
   * Envía mensaje al AI Agent Sofía V3 vía chatTrigger n8n.
   * Usa AbortController con timeout de 90s (el motor de reputación puede tardar).
   */
  const sendToSofia = useCallback(async (userMessage) => {
    setIsTyping(true);
    setError(null);

    const controller = new AbortController();
    // 90 segundos: el scraper de reputación puede tardar hasta 2-3 minutos
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(SOFIA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatInput: userMessage,
          sessionId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      const sofiaReply = data.output || data.text || data.reply || 'Lo siento, no he podido procesar tu mensaje. Por favor inténtalo de nuevo.';

      setIsTyping(false);
      addMessage(sofiaReply, 'agent');

    } catch (err) {
      clearTimeout(timeoutId);
      setIsTyping(false);

      if (err.name === 'AbortError') {
        addMessage(
          '⏱️ Rosa María está analizando datos de reputación en tiempo real, esto puede tardar unos minutos. Por favor, envía tu mensaje de nuevo si el canal no responde.',
          'agent'
        );
      } else {
        setError('Rosa María no está disponible en este momento. Si el problema persiste, contáctanos en informacion@ia-bybusiness.com');
        addMessage(
          '⚠️ Ha habido un problema técnico. El equipo de IA-ByBusiness ha sido notificado. Por favor inténtalo en unos minutos.',
          'agent'
        );
      }
    }

    setIsSending(false);
  }, [sessionId, addMessage]);

  /** Maneja la selección de uno de los 3 flujos iniciales */
  const handleFlowSelect = useCallback(async (flowId, label) => {
    setFlowStarted(true);
    addMessage(label, 'user');
    await sendToSofia(FLOW_STARTERS[flowId]);
  }, [addMessage, sendToSofia]);

  /** Maneja el envío de un mensaje libre del usuario */
  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending || isTyping) return;

    const text = input.trim();
    setInput('');
    setIsSending(true);
    addMessage(text, 'user');
    await sendToSofia(text);
  }, [input, isSending, isTyping, addMessage, sendToSofia]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    // Mensaje de bienvenida local inmediato
    if (messages.length === 0) {
      setTimeout(() => {
        addMessage(
          '¡Hola! 👋 Bienvenido a IA-ByBusiness.\n\nSoy Rosa María, tu consultora de IA personal. Estoy conectada a motores de análisis de reputación en tiempo real propios.\n\n¿En qué puedo ayudarte hoy?',
          'agent'
        );
      }, 600);
    }
  }, [messages.length, addMessage]);

  const isBlocked = isSending || isTyping;

  return (
    <div className="fixed bottom-24 lg:bottom-6 right-6 z-[9999] font-sans">
      {/* Botón Flotante */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleOpen}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366] text-white shadow-2xl transition-all hover:scale-110 active:scale-95"
          >
            <div className="absolute inset-0 animate-ping rounded-full bg-[#25d366]/40 pointer-events-none" />
            <MessageCircle className="h-8 w-8 relative z-10" />
            <span className="absolute -top-12 right-0 hidden whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-xl group-hover:block border border-slate-100">
              ¡Habla con Rosa María! 🤖
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Ventana de Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20 }}
            className="flex h-[600px] w-[390px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0"
              style={{ backgroundColor: WHATSAPP_GREEN }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/10 p-1 rounded-full transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="relative">
                  <img
                    src="https://ui-avatars.com/api/?name=Rosa+Maria&bg=white&color=00a884&size=40"
                    alt="Rosa María"
                    className="h-10 w-10 rounded-full border-2 border-white/30"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#00a884]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Rosa María · Consultora IA</h3>
                  <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    {isTyping ? 'Escribiendo...' : 'en línea · IA ByBusiness'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <MoreVertical className="h-5 w-5 opacity-70 cursor-pointer" />
                <X
                  onClick={() => setIsOpen(false)}
                  className="h-5 w-5 opacity-70 cursor-pointer hover:opacity-100"
                />
              </div>
            </div>

            {/* Área de Chat */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
              style={{
                backgroundColor: WHATSAPP_BG,
                backgroundImage: 'url("https://wweb.dev/assets/whatsapp-chat-wallpaper.png")',
                backgroundSize: '400px',
                backgroundBlendMode: 'overlay'
              }}
            >
              {/* Chip informativo con modo demo */}
              <div className="flex justify-center">
                <span className="bg-black/20 text-white text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-sm">
                  🤖 Rosa María · IA conectada a motores de reputación en vivo
                </span>
              </div>

              {/* Mensajes */}
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {/* Indicador de escritura */}
              {isTyping && <TypingIndicator />}

              {/* Chips de selección de flujo — solo si no se ha iniciado conversación */}
              {!flowStarted && messages.length > 0 && !isTyping && (
                <div className="grid gap-2 pt-1 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[10px] text-center font-semibold text-slate-600 bg-white/60 rounded-lg px-3 py-1">
                    ¿Cómo puedo ayudarte?
                  </p>
                  <button
                    id="btn-flow-ventas"
                    onClick={() => handleFlowSelect('VENTAS', '💰 Quiero información sobre servicios')}
                    className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/90 p-3 text-sm font-medium text-emerald-800 backdrop-blur-sm transition-all hover:bg-emerald-50 hover:shadow-md text-left"
                  >
                    <Briefcase className="h-4 w-4 flex-shrink-0" />
                    <span>Quiero información / Tengo un negocio</span>
                  </button>
                  <button
                    id="btn-flow-soporte"
                    onClick={() => handleFlowSelect('SOPORTE', '👤 Soy cliente de ByBusiness')}
                    className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white/90 p-3 text-sm font-medium text-blue-800 backdrop-blur-sm transition-all hover:bg-blue-50 hover:shadow-md text-left"
                  >
                    <Headset className="h-4 w-4 flex-shrink-0" />
                    <span>Soy cliente · Necesito soporte</span>
                  </button>
                  <button
                    id="btn-flow-rrhh"
                    onClick={() => handleFlowSelect('RRHH', '💼 Busco empleo como operador de llamadas')}
                    className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white/90 p-3 text-sm font-medium text-amber-800 backdrop-blur-sm transition-all hover:bg-amber-50 hover:shadow-md text-left"
                  >
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span>Empleo · Operador de llamadas</span>
                  </button>
                </div>
              )}

              {/* Banner de error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="bg-[#f0f2f5] p-3 border-t border-slate-200 flex-shrink-0">
              {/* Indicador de análisis activo */}
              {isTyping && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-600 shadow-sm border border-slate-100">
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                    Rosa María está consultando datos en tiempo real...
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  id="sofia-chat-input"
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isBlocked || !flowStarted}
                  placeholder={
                    !flowStarted
                      ? 'Selecciona una opción arriba para empezar...'
                      : isTyping
                        ? 'Rosa María está escribiendo...'
                        : 'Escribe tu mensaje...'
                  }
                  className="flex-1 resize-none rounded-lg bg-white px-4 py-2.5 text-sm outline-none placeholder:text-slate-400 disabled:opacity-50 max-h-24 leading-relaxed"
                  style={{ scrollbarWidth: 'none' }}
                />
                <button
                  id="sofia-send-btn"
                  onClick={handleSend}
                  disabled={!input.trim() || isBlocked || !flowStarted}
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white transition-all ${!input.trim() || isBlocked || !flowStarted
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-[#00a884] hover:scale-105 active:scale-95 shadow-md'
                    }`}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <p className="text-[9px] text-slate-400 text-center mt-2">
                Rosa María puede tardar unos minutos al analizar sectores · Powered by IA-ByBusiness
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatsAppWidget;
