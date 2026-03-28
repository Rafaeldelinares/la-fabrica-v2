import PropTypes from 'prop-types';

/**
 * Footer con logo, copyright y links legales.
 * Cada link legal dispara un callback para abrir el modal correspondiente.
 *
 * @param {object}   props
 * @param {Function} props.onAvisoLegal - Abre el modal de Aviso Legal.
 * @param {Function} props.onPrivacidad - Abre el modal de Política de Privacidad.
 * @param {Function} props.onCookies    - Abre el modal de Política de Cookies.
 */
export default function Footer({ onAvisoLegal, onPrivacidad, onCookies }) {
  const linkClass =
    'text-slate-400 text-sm hover:text-blue-600 transition-colors cursor-pointer underline underline-offset-2';

  return (
    <footer className="bg-white border-t border-slate-100 py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="IA-ByBusiness" className="h-6 w-auto" />
          <span className="text-slate-400 text-sm">
            © 2025 IA-ByBusiness · Todos los derechos reservados
          </span>
        </div>
        <div className="flex gap-6">
          <button type="button" onClick={onAvisoLegal} className={linkClass}>
            Aviso Legal
          </button>
          <button type="button" onClick={onPrivacidad} className={linkClass}>
            Privacidad
          </button>
          <button type="button" onClick={onCookies} className={linkClass}>
            Política de Cookies
          </button>
        </div>
      </div>
    </footer>
  );
}

Footer.propTypes = {
  onAvisoLegal: PropTypes.func.isRequired,
  onPrivacidad: PropTypes.func.isRequired,
  onCookies: PropTypes.func.isRequired,
};
