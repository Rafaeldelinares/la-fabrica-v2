import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import StatsSection from './components/StatsSection';
import ProblemSection from './components/ProblemSection';
import SolutionSection from './components/SolutionSection';
import HowItWorksSection from './components/HowItWorksSection';
import ServicesSection from './components/ServicesSection';
import TarjetasCarousel from './components/TarjetasCarousel';
import FaqSection from './components/FaqSection';
import LeadForm from './components/LeadForm';
import Footer from './components/Footer';
import LegalModal from './components/LegalModal';
import CookieBanner from './components/CookieBanner';
import { AVISO_LEGAL, POLITICA_PRIVACIDAD, POLITICA_COOKIES } from './legal/textos';

const scrollToForm = () => {
  document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' });
};

/**
 * Componente raíz de la landing page de IA-ByBusiness.
 * Gestiona el estado global del modal legal y el banner de cookies.
 */
const App = () => {
  /** @type {[{titulo: string, contenido: string}|null, Function]} */
  const [modal, setModal] = useState(null);

  const handleAvisoLegal = () => setModal(AVISO_LEGAL);
  const handlePrivacidad = () => setModal(POLITICA_PRIVACIDAD);
  const handleCookies = () => setModal(POLITICA_COOKIES);
  const handleCloseModal = () => setModal(null);

  return (
    <div className="min-h-screen">
      <Navbar onCtaClick={scrollToForm} />
      <Hero onCtaClick={scrollToForm} />
      <StatsSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <ServicesSection />
      <TarjetasCarousel />
      <FaqSection />
      <LeadForm onVerPrivacidad={handlePrivacidad} />
      <Footer
        onAvisoLegal={handleAvisoLegal}
        onPrivacidad={handlePrivacidad}
        onCookies={handleCookies}
      />

      {modal && (
        <LegalModal
          titulo={modal.titulo}
          contenido={modal.contenido}
          onClose={handleCloseModal}
        />
      )}

      <CookieBanner onVerCookies={handleCookies} />
    </div>
  );
};

export default App;
