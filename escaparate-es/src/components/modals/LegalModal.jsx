import React from 'react';
import PropTypes from 'prop-types';
import { Scale, X } from 'lucide-react';

/**
 * Modal de información legal: Aviso Legal (LSSI), Privacidad (RGPD) y Cookies.
 * Diseño simple — un único bloque scrollable, sin tabs ni flex dinámico.
 *
 * @param {object}   props
 * @param {boolean}  props.isOpen  - Controla la visibilidad del modal.
 * @param {Function} props.onClose - Callback para cerrar el modal.
 */
export const LegalModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl border border-slate-200">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">Marco Legal</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal legal"
            className="text-slate-300 hover:text-slate-900 bg-transparent border-none cursor-pointer transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="px-8 py-6 overflow-y-auto" style={{ maxHeight: '60vh' }}>

          {/* Aviso Legal */}
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Aviso Legal (LSSI)</h3>
          <div className="text-[11px] text-slate-600 leading-relaxed space-y-1 mb-6">
            <p><strong className="text-slate-800">Titular:</strong> Rosa María Passalacqua Herrera</p>
            <p><strong className="text-slate-800">Nombre comercial:</strong> ByBusiness / Agencia Partner ByBusiness</p>
            <p><strong className="text-slate-800">NIF:</strong> 77423412F</p>
            <p><strong className="text-slate-800">Domicilio:</strong> Calle Cuevas Bajas, 4 · Edificio Picasso · Planta 1ª, Oficina 7 · Málaga</p>
            <p><strong className="text-slate-800">Email:</strong> info@bybusiness.es</p>
            <p><strong className="text-slate-800">Teléfono:</strong> 952 856 697</p>
            <p><strong className="text-slate-800">Web corporativa:</strong> www.bybusiness.com</p>
            <p className="pt-2">
              <strong>ia-bybusiness</strong> es una marca de Agencia Partner ByBusiness, actividad ejercida por
              Rosa María Passalacqua Herrera (NIF: 77423412F). Los dominios <em>ia-bybusiness.com</em> e{' '}
              <em>ia-bybusiness.es</em> son operados íntegramente por dicha titular.
            </p>
          </div>

          {/* Privacidad */}
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-t border-slate-100 pt-6">Privacidad (RGPD)</h3>
          <div className="text-[11px] text-slate-600 leading-relaxed space-y-2 mb-6">
            <p><strong className="text-slate-800">Responsable:</strong> Rosa María Passalacqua Herrera · info@bybusiness.es · 952 856 697</p>
            <p><strong className="text-slate-800">Finalidades:</strong> atención comercial (Art. 6.1.b RGPD), selección de personal (Art. 6.1.b RGPD), métricas anónimas de mejora (Art. 6.1.f RGPD).</p>
            <p><strong className="text-slate-800">Destinatarios:</strong> no se ceden datos a terceros salvo obligación legal.</p>
            <p>
              <strong className="text-slate-800">Derechos:</strong> acceso, rectificación, supresión, limitación, portabilidad y oposición
              escribiendo a <strong>info@bybusiness.es</strong> con el asunto &ldquo;Derechos RGPD&rdquo;.
              También puede reclamar ante la <strong>AEPD</strong> (www.aepd.es).
            </p>
          </div>

          {/* Cookies */}
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-t border-slate-100 pt-6">Cookies</h3>
          <div className="text-[11px] text-slate-600 leading-relaxed space-y-2">
            <p>Solo se utilizan <strong>cookies técnicas</strong> necesarias para el funcionamiento:</p>
            <p><strong className="text-slate-800">cookies_accepted</strong> — preferencia de aceptación (localStorage, persistente).</p>
            <p>No se usan cookies de rastreo ni publicidad. No se comparten datos de navegación con terceros.</p>
          </div>

        </div>

        {/* Botón cierre */}
        <div className="px-8 pb-8 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
          >
            ACEPTAR Y CERRAR
          </button>
        </div>

      </div>
    </div>
  );
};

LegalModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
