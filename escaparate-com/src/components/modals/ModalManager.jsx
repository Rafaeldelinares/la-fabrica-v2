import React, { useState } from 'react';
import { Mail, Briefcase, Scale, ArrowRight, ShieldCheck } from 'lucide-react';

export const ContactModal = ({ isOpen, onClose, captcha, onSubmit, captchaInput, setCaptchaInput }) => {
  const [accepted, setAccepted] = useState(true);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[40px] shadow-2xl max-w-4xl w-full overflow-y-auto max-h-[90vh] flex flex-col md:flex-row border border-slate-200">
        <div className="hidden md:flex bg-slate-900 md:w-1/3 p-10 text-white flex-col justify-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg"><Mail className="w-8 h-8 text-blue-400" /></div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">Contacto Pro</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Asistencia Directa IA-ByBusiness</p>
        </div>
        <div className="md:w-2/3 p-6 md:p-12 relative">
          <button onClick={onClose} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 border-none bg-transparent cursor-pointer"><ArrowRight className="rotate-180 w-6 h-6" /></button>
          <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter">Solicitar Auditoría</h2>
          <form onSubmit={onSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <input name="name" required placeholder="Nombre" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
               <input name="phone" required placeholder="Teléfono" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
             </div>
             <input name="email" type="email" required placeholder="tu@email.com" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
             <input name="company" required placeholder="Empresa / Negocio" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
             <input name="localidad" required placeholder="Ciudad / Localidad" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
             <textarea name="mensaje" rows={3} placeholder="¿En qué podemos ayudarte? Cuéntanos tu necesidad..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none" />

             <div className="flex items-start gap-3 p-2">
                <input
                  type="checkbox"
                  id="rgpd_contact" 
                  checked={accepted} 
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                  required
                />
                <label htmlFor="rgpd_contact" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                  Acepto el tratamiento de mis datos según el RGPD (España/UE) para fines de auditoría profesional.
                </label>
             </div>

             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-inner">
                <label htmlFor="captcha_contact" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seguridad: {captcha.q} = ?</label>
                <input id="captcha_contact" name="captcha" aria-label={`Resultado de ${captcha.q}`} value={captchaInput} onChange={e=>setCaptchaInput(e.target.value)} required placeholder="?" className="w-16 bg-white border border-slate-200 rounded-xl p-3 text-center text-sm font-black" />
             </div>
             <button
              type="submit"
              disabled={!accepted}
              className={`w-full font-black py-5 rounded-2xl transition-all text-[11px] uppercase tracking-widest mt-4 ${accepted ? 'bg-blue-600 text-white hover:bg-slate-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             >
                ENVIAR SOLICITUD
             </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const ATSModal = ({ isOpen, onClose, captcha, onSubmit, captchaInput, setCaptchaInput }) => {
  const [accepted, setAccepted] = useState(true);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[40px] shadow-2xl max-w-4xl w-full overflow-y-auto max-h-[90vh] flex flex-col md:flex-row border border-slate-200">
        <div className="hidden md:flex bg-blue-600 md:w-1/3 p-10 text-white flex-col justify-center gap-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg"><Briefcase className="w-8 h-8" /></div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">Portal ATS</h3>
          <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest leading-tight">Únete al Equipo de la Fábrica</p>
        </div>
        <div className="md:w-2/3 p-6 md:p-12 relative">
          <button onClick={onClose} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 border-none bg-transparent cursor-pointer"><ArrowRight className="rotate-180 w-6 h-6" /></button>
          <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter">Enviar CV</h2>
          <form onSubmit={onSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <input name="name" required placeholder="Nombre" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
               <input name="phone" required placeholder="Teléfono" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
             </div>
             <input name="email" type="email" required placeholder="tu@email.com" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
             <input name="puesto" placeholder="Puesto / Área de interés" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
             <div>
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Adjuntar CV (PDF / DOC)</label>
               <input name="cv_file" type="file" accept=".pdf,.doc,.docx" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer" />
             </div>

             <div className="flex items-start gap-3 p-2">
                <input
                  type="checkbox"
                  id="rgpd_ats" 
                  checked={accepted} 
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                  required
                />
                <label htmlFor="rgpd_ats" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                  Acepto el tratamiento de mis datos según el RGPD para procesos de selección de la Fábrica de Software.
                </label>
             </div>

             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-inner">
                <label htmlFor="captcha_ats" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seguridad: {captcha.q} = ?</label>
                <input id="captcha_ats" name="captcha" aria-label={`Resultado de ${captcha.q}`} value={captchaInput} onChange={e=>setCaptchaInput(e.target.value)} required placeholder="?" className="w-16 bg-white border border-slate-200 rounded-xl p-3 text-center text-sm font-black" />
             </div>
             <button
              type="submit"
              disabled={!accepted}
              className={`w-full font-black py-5 rounded-2xl transition-all text-[11px] uppercase tracking-widest mt-4 ${accepted ? 'bg-slate-900 text-white hover:bg-blue-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             >
                ENVIAR CANDIDATURA
             </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const LegalModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
       <div className="bg-white rounded-[40px] p-12 max-w-xl w-full relative border border-white/20 shadow-2xl animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8"><Scale className="w-8 h-8" /></div>
          <h2 className="text-3xl font-black mb-6 uppercase tracking-tighter">Marco Legal IA</h2>
          <p className="text-[10px] text-slate-500 leading-loose font-bold uppercase tracking-widest mb-8">
            Nuestra plataforma opera bajo criterios estrictos de transparencia. La extracción de métricas se basa en datos públicos recopilados bajo el principio de interés legítimo (**Art. 6.1.f del RGPD de España y la UE**).
          </p>
          <button onClick={onClose} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">ACEPTAR TÉRMINOS</button>
       </div>
    </div>
  );
};
