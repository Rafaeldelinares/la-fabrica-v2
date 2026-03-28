import { useState } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle } from 'lucide-react';

const WEBHOOK = 'https://n8n.ia-bybusiness.online/webhook/landing-lead-nuevo';

const INITIAL_FORM = {
  nombre: '',
  nombre_negocio: '',
  telefono: '',
  email: '',
  ciudad: '',
  descripcion: '',
};

const inputClass =
  'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';

/**
 * Formulario de captación de leads con submit a webhook n8n.
 * Requiere consentimiento explícito de privacidad (RGPD Art. 6.1.a) antes de enviar.
 *
 * @param {object}   props
 * @param {Function} props.onVerPrivacidad - Callback para abrir el modal de Política de Privacidad.
 */
export default function LeadForm({ onVerPrivacidad }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error');
      setStatus('success');
    } catch {
      /* network error */
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <section id="formulario" className="bg-slate-50 py-24 px-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-8 lg:p-12 text-center">
          <div className="flex items-center justify-center mb-6">
            <CheckCircle className="text-green-500" size={56} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">
            ¡Recibido! Te contactaremos en menos de 24 horas.
          </h2>
          <p className="text-slate-500">
            Un experto revisará tu caso y te llamará para hacer el diagnóstico gratuito.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="formulario" className="bg-slate-50 py-24 px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-8 lg:p-12">
        <h2 className="text-3xl font-black text-slate-900 mb-3">
          Cuéntanos sobre tu negocio
        </h2>
        <p className="text-slate-500 mb-10">
          Un experto te contactará en menos de 24 horas para hacer un diagnóstico gratuito.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              required
              placeholder="Tu nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nombre del negocio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre_negocio"
              required
              placeholder="¿Cómo se llama tu negocio?"
              value={formData.nombre_negocio}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="telefono"
              required
              placeholder="+34 600 000 000"
              value={formData.telefono}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Ciudad
            </label>
            <input
              type="text"
              name="ciudad"
              placeholder="¿Dónde está tu negocio?"
              value={formData.ciudad}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Cuéntanos tu situación
            </label>
            <textarea
              name="descripcion"
              rows={4}
              placeholder="¿Cuál es tu principal reto ahora mismo?"
              value={formData.descripcion}
              onChange={handleChange}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Consentimiento RGPD — requerido para enviar */}
          <div className="flex items-start gap-3 pt-1">
            <input
              type="checkbox"
              id="acepta-privacidad"
              required
              checked={aceptaPrivacidad}
              onChange={(e) => setAceptaPrivacidad(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="acepta-privacidad"
              className="text-sm text-slate-600 leading-snug cursor-pointer"
            >
              He leído y acepto la{' '}
              <button
                type="button"
                onClick={onVerPrivacidad}
                className="text-blue-600 underline underline-offset-2 hover:text-blue-800 transition-colors cursor-pointer"
              >
                Política de Privacidad
              </button>{' '}
              <span className="text-red-500">*</span>
            </label>
          </div>

          {status === 'error' && (
            <p className="text-red-600 text-sm text-center">
              Ha ocurrido un error. Por favor, inténtalo de nuevo.
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest rounded-2xl py-4 shadow-xl shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
          >
            {status === 'loading' ? 'Enviando...' : 'Solicitar diagnóstico gratuito →'}
          </button>
        </form>
      </div>
    </section>
  );
}

LeadForm.propTypes = {
  onVerPrivacidad: PropTypes.func.isRequired,
};
