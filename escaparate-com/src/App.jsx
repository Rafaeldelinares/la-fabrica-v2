import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Zap, Cpu, CheckCircle2, ShieldCheck,
  ChevronLeft, ChevronRight, Home, Layers, Mail, Briefcase
} from 'lucide-react';
import Footer from './components/layout/Footer';
import WhatsAppWidget from './components/widgets/WhatsAppWidget';
import WhatsAppAssistant from './components/widgets/WhatsAppAssistant';
import { ContactModal, ATSModal, LegalModal } from './components/modals/ModalManager';

// ── Barra de progreso segmentada — solo mobile ────────────────────────────────
const MobileProgressBar = ({ step, total, isPaused, duration }) => (
  <div className="lg:hidden flex-none flex items-center gap-1 px-4 h-7 bg-white border-b border-slate-100">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden bg-slate-200">
        {i < step && <div className="h-full w-full bg-blue-600" />}
        {i === step && !isPaused && (
          <motion.div
            key={`seg-${step}`}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            className="h-full bg-blue-600"
          />
        )}
      </div>
    ))}
  </div>
);

// ── Dots de posición dentro de la sección — solo mobile ──────────────────────
const SectionDots = ({ step }) => {
  let count = 0, active = 0;
  if (step >= 1 && step <= 3) { count = 3; active = step - 1; }
  else if (step >= 5 && step <= 8) { count = 4; active = step - 5; }
  if (!count) return null;
  const dark = step >= 4;
  return (
    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 lg:hidden pointer-events-none z-[105]">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === active
              ? 'w-5 h-1.5 bg-blue-500'
              : dark ? 'w-1.5 h-1.5 bg-white/25' : 'w-1.5 h-1.5 bg-slate-300'
          }`}
        />
      ))}
    </div>
  );
};

// ── Bottom Navigation — solo mobile ──────────────────────────────────────────
const MobileBottomNav = ({ step, setStep, onContact, onATS }) => {
  const tabs = [
    { label: 'Inicio',    icon: Home,      action: () => setStep(0), active: step === 0 },
    { label: 'Servicios', icon: Layers,    action: () => setStep(1), active: step >= 1 && step <= 3 },
    { label: 'Stack',     icon: Cpu,       action: () => setStep(4), active: step >= 4 && step <= 8 },
    { label: 'Trabaja',   icon: Briefcase, action: onATS,            active: false },
    { label: 'Contactar', icon: Mail,      action: onContact,        active: false },
  ];
  return (
    <nav className="lg:hidden flex-none h-16 bg-white border-t border-slate-100 flex relative z-[200]">
      {tabs.map(({ label, icon: Icon, action, active }) => (
        <button
          key={label}
          onClick={action}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors active:bg-slate-50 ${
            active ? 'text-blue-600' : 'text-slate-400'
          }`}
        >
          {active && <div className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-blue-600" />}
          <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`} />
          <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
        </button>
      ))}
    </nav>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [showContactModal, setShowContactModal]     = useState(false);
  const [showCandidatoModal, setShowCandidatoModal] = useState(false);
  const [showLegalModal, setShowLegalModal]         = useState(false);
  const [showCookieBanner, setShowCookieBanner]     = useState(() => !localStorage.getItem('cookies_accepted'));
  const [captcha, setCaptcha]       = useState({ q: '5 + 3', a: 8 });
  const [captchaInput, setCaptchaInput] = useState('');

  // 0: Hero | 1-3: Soluciones | 4: Stack Intro | 5-8: Stack Detail
  const [step, setStep]       = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const TOTAL_STEPS   = 9;
  const STEP_DURATION = 5000;

  const nextStep = useCallback(() => setStep((s) => (s + 1) % TOTAL_STEPS), []);
  const prevStep = useCallback(() => setStep((s) => (s - 1 + TOTAL_STEPS) % TOTAL_STEPS), []);

  const refreshCaptcha = useCallback(() => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ q: `${n1} + ${n2}`, a: n1 + n2 });
    setCaptchaInput('');
  }, []);

  // ── Swipe / Touch (móvil) ─────────────────────────────────────────────────
  const touchStartX   = useRef(null);
  const pauseTimerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) nextStep();
      else prevStep();
    }
    touchStartX.current = null;
    pauseTimerRef.current = setTimeout(() => setIsPaused(false), 3000);
  }, [nextStep, prevStep]);

  useEffect(() => () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); }, []);

  // ── Rotación automática ───────────────────────────────────────────────────
  useEffect(() => {
    if (showContactModal || showCandidatoModal || showLegalModal || isPaused) return;
    const interval = setInterval(nextStep, STEP_DURATION);
    return () => clearInterval(interval);
  }, [nextStep, isPaused, showContactModal, showCandidatoModal, showLegalModal]);

  // ── Teclado ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showContactModal || showCandidatoModal || showLegalModal) return;
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft')  prevStep();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextStep, prevStep, showContactModal, showCandidatoModal, showLegalModal]);

  const cardsData = [
    {
      id: 'crm',
      title: 'CRM PROPIETARIO & DATOS',
      icon: Database,
      long: 'Implementamos infraestructuras de datos donde tú eres el único dueño. Olvida los pagos por asiento. Diseñamos sistemas que crecen contigo.',
      features: ['Soberanía Europea', 'Cero Licencias', 'SQL Nativo']
    },
    {
      id: 'ia',
      title: 'POSICIONAMIENTO IA',
      icon: Zap,
      long: 'Agentes autónomos que escanean Google Maps y Search cada hora. Analizamos competencia y ajustamos rankings técnicos para dominar el mercado local.',
      features: ['Vigilancia Maps', 'Ranking Automático', 'Auditoría Competencia']
    },
    {
      id: 'automation',
      title: 'AUTOMATIZACIÓN N8N',
      icon: Cpu,
      long: 'Desde leads hasta facturación, creamos flujos de ingeniería n8n que trabajan mientras tú descansas, eliminando procesos repetitivos.',
      features: ['Flujos n8n', 'Cero Fricción', 'Escalabilidad']
    }
  ];

  const techStack = [
    { name: 'n8n Engineering',  logo: '/logos/n8n.svg',        desc: 'Orquestación de procesos' },
    { name: 'PostgreSQL',       logo: '/logos/postgresql.svg', desc: 'Soberanía de datos' },
    { name: 'React / Vite',     logo: '/logos/react.svg',      desc: 'Interfaces de alto rendimiento' },
    { name: 'Playwright',       logo: '/logos/playwright.svg', desc: 'Extracción de datos pro' }
  ];

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    if (parseInt(captchaInput) !== captcha.a) {
      alert("CAPTCHA incorrecto. Inténtelo de nuevo.");
      refreshCaptcha();
      return;
    }
    const formData = new FormData(e.target);
    const data = {
      nombre: formData.get('name'),
      telefono: formData.get('phone'),
      email: formData.get('email'),
      company: formData.get('company') || 'N/A',
      localidad: formData.get('localidad') || '',
      mensaje: formData.get('mensaje') || '',
      puesto: formData.get('puesto') || '',
      tipo_solicitud: type,
      timestamp: new Date().toISOString(),
      agente: "Escaparate_COM_v1"
    };
    if (type === 'CANDIDATO') {
      const cvFile = formData.get('cv_file');
      if (cvFile && cvFile.size > 0) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(cvFile);
        });
        data.cv_filename = cvFile.name;
        data.cv_base64 = base64;
      }
    }
    try {
      const webhookUrl = import.meta.env.VITE_API_URL || 'http://localhost:5678/webhook/lead-captura';
      console.log("🚀 Disparando datos a:", webhookUrl);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        alert("Solicitud enviada con éxito. Impacto Confirmado en la Fábrica.");
        if (type === 'CONTACTO')   setShowContactModal(false);
        if (type === 'CANDIDATO')  setShowCandidatoModal(false);
      } else {
        throw new Error('Error en el servidor');
      }
    } catch (err) {
      console.error(err);
      alert("Error al enviar la solicitud. Verifique la conexión con el motor n8n.");
    }
  };

  const openContact = useCallback(() => { refreshCaptcha(); setShowContactModal(true); }, [refreshCaptcha]);

  return (
    <div className="h-screen overflow-hidden w-screen flex flex-col bg-white font-sans select-none relative">

      {/* Cookie banner */}
      <AnimatePresence>
        {showCookieBanner && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-8 py-5 rounded-[32px] shadow-2xl flex items-center gap-8 border border-white/10 w-[90%] max-w-2xl"
          >
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-6 h-6 text-blue-500 flex-none" />
              <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                Uso de cookies técnicas según normativa RGPD Internacional/UE.
              </p>
            </div>
            <button
              onClick={() => { localStorage.setItem('cookies_accepted', 'true'); setShowCookieBanner(false); }}
              className="flex-none bg-white text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase"
            >ACEPTAR</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="glass-nav flex-none border-b border-slate-100 h-20 relative z-[100]">
        <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setStep(0); setIsPaused(false); }}>
            <img src="/logo.png" alt="IA-ByBusiness" className="h-10 w-auto" />
            <span className="hidden md:inline text-xl md:text-2xl font-bold tracking-tight text-slate-900">IA-ByBusiness</span>
          </div>
          <div className="flex items-center gap-8">
            {/* Barra de progreso — solo desktop */}
            <div className="hidden lg:block w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
              <motion.div
                key={`progress-${step}-${isPaused}`}
                initial={{ width: "0%" }}
                animate={{ width: isPaused ? "0%" : "100%" }}
                transition={{ duration: isPaused ? 0 : STEP_DURATION / 1000, ease: "linear" }}
                className="h-full bg-blue-600"
              />
            </div>
            <button
              onClick={openContact}
              className="bg-blue-600 text-white px-6 lg:px-8 py-2 lg:py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              <span className="hidden sm:inline">SOLICITAR ACCESO</span>
              <span className="sm:hidden">ACCESO</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Barra segmentada — solo mobile */}
      <MobileProgressBar step={step} total={TOTAL_STEPS} isPaused={isPaused} duration={STEP_DURATION} />

      {/* Contenido principal */}
      <main
        className="flex-grow relative overflow-hidden group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Flechas — solo desktop */}
        <div className="hidden lg:flex absolute inset-y-0 left-0 w-24 z-[110] items-center justify-center pointer-events-none group-hover:pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); prevStep(); }}
            className="p-4 rounded-full text-slate-300 hover:text-blue-600 hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
        </div>
        <div className="hidden lg:flex absolute inset-y-0 right-0 w-24 z-[110] items-center justify-center pointer-events-none group-hover:pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); nextStep(); }}
            className="p-4 rounded-full text-slate-300 hover:text-blue-600 hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ── HERO ── */}
          {step === 0 && (
            <motion.section
              key="hero"
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 flex items-center justify-center p-8 text-center"
            >
              <div className="max-w-7xl">
                <p className="text-blue-600 text-[10px] font-black tracking-[0.4em] uppercase mb-4 md:mb-8">Protocolo: IA-ByBusiness</p>
                <h1 className="text-4xl md:text-6xl lg:text-[90px] font-bold text-slate-900 mb-6 lg:mb-8 tracking-tighter leading-tight">
                  No somos una Agencia.<br />
                  <span className="text-blue-600">Somos una Fábrica de Software.</span>
                </h1>
                <p className="max-w-3xl mx-auto text-lg md:text-2xl text-slate-500 font-medium leading-relaxed">
                  Ingeniería de Sistemas y CRM para empresas que exigen precisión técnica total y soberanía de datos.
                </p>
              </div>
            </motion.section>
          )}

          {/* ── SOLUCIONES ── */}
          {(step >= 1 && step <= 3) && (
            <motion.section
              key="soluciones"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 overflow-y-auto flex flex-col"
            >
              <div className="m-auto flex flex-col items-center p-6 lg:px-32 lg:py-16 w-full">
              <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.5em] mb-6 lg:mb-8">Sistemas Estratégicos en Marcha</h2>
              <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full max-w-7xl">
                {cardsData.map((card, i) => {
                  const isActive = step === (i + 1);
                  const IconComp = card.icon;
                  return (
                    <motion.div
                      key={card.id}
                      onClick={() => setStep(i + 1)}
                      initial={false}
                      animate={{
                        opacity: isActive ? 1 : (window.innerWidth < 768 ? 0 : 0.25),
                        scale: isActive ? 1.05 : 1,
                        display: (window.innerWidth < 768 && !isActive) ? 'none' : 'flex',
                        borderColor: isActive ? '#2563eb' : '#f1f5f9'
                      }}
                      whileHover={{ scale: isActive ? 1.05 : 1.02, opacity: 1 }}
                      className={`bg-white p-7 rounded-[32px] border shadow-sm flex flex-col items-start transition-all duration-500 cursor-pointer ${isActive ? 'shadow-2xl shadow-blue-500/10' : 'hover:shadow-xl hover:border-slate-200'}`}
                    >
                      <div className={`mb-6 p-4 rounded-2xl transition-all duration-500 ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600'}`}>
                        <IconComp className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mb-3 tracking-tighter uppercase">{card.title}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed mb-6">{card.long}</p>
                      <div className="mt-auto space-y-2 uppercase">
                        {card.features.map((f, fi) => (
                          <div key={fi} className="flex items-center gap-2 text-[8px] font-black text-slate-400 tracking-widest">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-blue-200'}`} /> {f}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              </div>
            </motion.section>
          )}

          {/* ── STACK ── */}
          {(step >= 4 && step <= 8) && (
            <motion.section
              key="stack"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-slate-950 overflow-y-auto flex flex-col"
            >
              <div className="m-auto max-w-7xl flex flex-col md:grid md:grid-cols-2 gap-12 items-center w-full p-6 lg:px-32 lg:py-16">
                <div className={`text-white transition-opacity duration-500 ${(window.innerWidth < 768 && step !== 4) ? 'hidden' : 'block'}`}>
                  <div className="inline-flex px-4 py-2 bg-blue-600/20 text-blue-400 text-[10px] font-black tracking-[0.25em] uppercase rounded-full mb-6 border border-blue-400/20">
                    INFRAESTRUCTURA PROPIA
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none text-white">Stack<br /><span className="text-blue-500">Tecnológico</span></h2>
                  <p className="text-slate-400 text-lg mb-8 leading-relaxed font-medium">
                    Utilizamos motores de ingeniería de última generación para garantizar la escalabilidad y seguridad de su negocio.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 py-4 w-full">
                  {techStack.map((tech, i) => {
                    const isActive = step === (i + 5);
                    return (
                      <motion.div
                        key={tech.name}
                        onClick={() => setStep(i + 5)}
                        initial={false}
                        animate={{
                          opacity: isActive ? 1 : (window.innerWidth < 768 ? 0 : 0.2),
                          display: (window.innerWidth < 768 && !isActive) ? 'none' : 'flex',
                          x: isActive ? 0 : -10,
                          backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.01)',
                          borderColor: isActive ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.05)'
                        }}
                        whileHover={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,255,255,0.05)' }}
                        className="p-5 border rounded-[24px] flex items-center gap-6 relative overflow-hidden group shadow-2xl cursor-pointer"
                      >
                        {isActive && (
                          <motion.div layoutId="stack-indicat-v5" className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                        )}
                        <div className={`p-3 rounded-2xl flex-none w-14 h-14 flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-white shadow-xl rotate-0' : 'bg-white/10 grayscale opacity-50 -rotate-3'}`}>
                          <img src={tech.logo} alt={tech.name} className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                          <h4 className={`font-black tracking-tight text-xl transition-colors uppercase ${isActive ? 'text-white' : 'text-slate-600'}`}>{tech.name}</h4>
                          <p className={`text-[10px] font-bold tracking-widest transition-colors uppercase ${isActive ? 'text-blue-400/80' : 'text-slate-700'}`}>{tech.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Dots de sección — solo mobile */}
        <SectionDots step={step} />
      </main>

      {/* Footer — solo desktop */}
      <div className="hidden lg:block">
        <Footer
          onContact={() => { refreshCaptcha(); setShowContactModal(true); }}
          onATS={() => { refreshCaptcha(); setShowCandidatoModal(true); }}
          onLegal={() => setShowLegalModal(true)}
        />
      </div>

      {/* Bottom Nav — solo mobile */}
      <MobileBottomNav
        step={step}
        setStep={setStep}
        onContact={() => { refreshCaptcha(); setShowContactModal(true); }}
        onATS={() => { refreshCaptcha(); setShowCandidatoModal(true); }}
      />

      {/* Modales */}
      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} captcha={captcha} captchaInput={captchaInput} setCaptchaInput={setCaptchaInput} onSubmit={(e) => handleSubmit(e, 'CONTACTO')} />
      <ATSModal isOpen={showCandidatoModal} onClose={() => setShowCandidatoModal(false)} captcha={captcha} captchaInput={captchaInput} setCaptchaInput={setCaptchaInput} onSubmit={(e) => handleSubmit(e, 'CANDIDATO')} />
      <LegalModal isOpen={showLegalModal} onClose={() => setShowLegalModal(false)} />

      {/* Widgets WhatsApp */}
      <WhatsAppWidget />
      <WhatsAppAssistant />
    </div>
  );
}

export default App;
