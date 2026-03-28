import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const STORAGE_KEY = 'cookie_consent';

/**
 * Banner de consentimiento de cookies fijo en la parte inferior de la pantalla.
 * Solo se muestra si el usuario no ha tomado una decisión previa (localStorage).
 * Al aceptar o rechazar, guarda la preferencia y se oculta permanentemente.
 *
 * @param {object}   props
 * @param {Function} props.onVerCookies - Callback para abrir el modal de Política de Cookies.
 */
export default function CookieBanner({ onVerCookies }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) setVisible(true);
  }, []);

  /**
   * Guarda la preferencia y oculta el banner.
   * @param {'necessary'|'all'} value
   */
  const handleConsent = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_24px_0_rgba(0,0,0,0.08)] px-4 py-4"
      role="region"
      aria-label="Aviso de cookies"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Texto */}
        <p className="text-sm text-slate-600 flex-1">
          Usamos cookies propias y de terceros para analítica y personalización.
          Podés aceptar todas o solo las necesarias.{' '}
          <button
            type="button"
            onClick={onVerCookies}
            className="text-blue-600 underline underline-offset-2 hover:text-blue-800 transition-colors cursor-pointer"
          >
            Política de Cookies
          </button>
          .
        </p>

        {/* Acciones */}
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleConsent('necessary')}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Solo necesarias
          </button>
          <button
            type="button"
            onClick={() => handleConsent('all')}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}

CookieBanner.propTypes = {
  onVerCookies: PropTypes.func.isRequired,
};
