import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Scale, X } from 'lucide-react';

/** Pestañas del modal legal. */
const TABS = ['Aviso Legal', 'Privacidad', 'Cookies'];

/** Contenido del Aviso Legal (LSSI). */
function TabAvisoLegal() {
  return (
    <div className="space-y-5 text-[11px] text-slate-600 leading-relaxed">
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Titular del sitio web</h3>
        <p><strong>Titular:</strong> Rosa María Passalacqua Herrera</p>
        <p><strong>Nombre comercial:</strong> ByBusiness / Agencia Partner ByBusiness</p>
        <p><strong>NIF:</strong> 77423412F</p>
        <p><strong>Domicilio:</strong> Calle Cuevas Bajas, 4 · Edificio Picasso · Planta 1ª, Oficina 7 · Málaga</p>
        <p><strong>Email:</strong> info@bybusiness.es</p>
        <p><strong>Teléfono:</strong> 952 856 697</p>
        <p><strong>Web corporativa:</strong> www.bybusiness.com</p>
      </section>
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Marca ia-bybusiness</h3>
        <p>
          <strong>ia-bybusiness</strong> es una marca y plataforma tecnológica de <strong>Agencia Partner ByBusiness</strong>,
          actividad ejercida por Rosa María Passalacqua Herrera (NIF: 77423412F).
          Los dominios <em>ia-bybusiness.com</em> e <em>ia-bybusiness.es</em> son operados íntegramente por dicha titular.
        </p>
      </section>
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Actividad</h3>
        <p>Consultoría tecnológica, desarrollo de software, automatización de procesos con inteligencia artificial y servicios de posicionamiento digital para empresas.</p>
      </section>
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Propiedad intelectual</h3>
        <p>Todos los contenidos, textos, imágenes y código de este sitio son propiedad de AGENCIA PARTNER BY BUSINESS SL. o están debidamente licenciados. Queda prohibida su reproducción sin autorización expresa.</p>
      </section>
    </div>
  );
}

/** Contenido de la Política de Privacidad (RGPD). */
function TabPrivacidad() {
  return (
    <div className="space-y-5 text-[11px] text-slate-600 leading-relaxed">
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Responsable del tratamiento</h3>
        <p>Rosa María Passalacqua Herrera (Agencia Partner ByBusiness) · info@bybusiness.es · 952 856 697</p>
      </section>
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Finalidades y base jurídica</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Atención a solicitudes de contacto comercial (Art. 6.1.b RGPD)</li>
          <li>Gestión de candidaturas y procesos de selección (Art. 6.1.b RGPD)</li>
          <li>Métricas de mejora de la plataforma con datos anónimos (Art. 6.1.f RGPD — interés legítimo)</li>
        </ul>
      </section>
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Destinatarios</h3>
        <p>No se ceden datos personales a terceros salvo obligación legal. Los proveedores de infraestructura actúan como encargados del tratamiento bajo acuerdo DPA.</p>
      </section>
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Derechos del interesado</h3>
        <p>Puede ejercer sus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición escribiendo a <strong>info@bybusiness.es</strong> con el asunto &quot;Derechos RGPD&quot;.</p>
        <p className="mt-1">También puede presentar una reclamación ante la <strong>Agencia Española de Protección de Datos</strong> (www.aepd.es).</p>
      </section>
    </div>
  );
}

/** Contenido de la Política de Cookies. */
function TabCookies() {
  return (
    <div className="space-y-5 text-[11px] text-slate-600 leading-relaxed">
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Cookies utilizadas</h3>
        <p>Este sitio utiliza únicamente <strong>cookies técnicas</strong> necesarias para su funcionamiento:</p>
        <ul className="list-disc pl-4 space-y-1 mt-2">
          <li><code>cookies_accepted</code> — Almacena la preferencia de aceptación (localStorage, persistente).</li>
        </ul>
      </section>
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Lo que no hacemos</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>No utilizamos cookies de rastreo ni publicidad</li>
          <li>No compartimos datos de navegación con terceros</li>
        </ul>
      </section>
      <section>
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Cómo eliminarlas</h3>
        <p>Desde la configuración de su navegador en Privacidad → Borrar datos de navegación.</p>
      </section>
    </div>
  );
}

const TAB_CONTENT = [TabAvisoLegal, TabPrivacidad, TabCookies];

/**
 * Modal de información legal con tres secciones en tabs:
 * Aviso Legal (LSSI), Privacidad (RGPD) y Cookies.
 *
 * @param {object}   props
 * @param {boolean}  props.isOpen  - Controla la visibilidad del modal.
 * @param {Function} props.onClose - Callback para cerrar el modal.
 */
export const LegalModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  if (!isOpen) return null;

  const TabContent = TAB_CONTENT[activeTab];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in zoom-in duration-300">

        <div className="flex items-center justify-between p-8 pb-0 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">Marco Legal</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal legal"
            className="text-slate-300 hover:text-slate-900 border-none bg-transparent cursor-pointer transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-0 px-8 pt-6 flex-none border-b border-slate-100">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-none bg-transparent cursor-pointer pb-3 transition-colors border-b-2 ${
                activeTab === i
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <TabContent />
        </div>

        <div className="p-8 pt-0 flex-none">
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
