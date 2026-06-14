import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ShieldCheck, Loader } from 'lucide-react';
import { n8nPost } from '../../shared/hooks/useN8n';

/**
 * Verify2FAScreen — Pantalla de verificación TOTP para usuarios con 2FA ya configurado.
 * Se muestra cuando totp_habilitado=true && totp_configurado=true.
 * Llama al webhook crm-verificar-2fa y, si OK, navega al CRM.
 *
 * @param {Object} props
 * @param {Object} props.usuario - Datos del usuario con id, email
 * @param {string} props.email - Email mostrado en el saludo
 * @param {Function} props.onSuccess - Callback cuando la verificación es exitosa
 */
const Verify2FAScreen = ({ usuario, email, onSuccess }) => {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const verificar = async (val) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const data = await n8nPost('crm-verificar-2fa', { usuario_id: usuario.id, codigo: val, is_setup: false });
      if (data.ok) {
        onSuccess();
      } else {
        setErrorMsg(data.error || 'CÓDIGO ERRÓNEO. Sincronizá tu reloj e intentá de nuevo.');
        setCodigo('');
      }
    } catch {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodigoChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 6) {
      setCodigo(val);
      if (val.length === 6) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => verificar(val), 50);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (codigo.length === 6) verificar(codigo);
  };

  return (
    <form className="flex flex-col gap-6 animate-fadeIn" onSubmit={handleSubmit}>
      <div className="text-center space-y-2 mb-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-[#D00000]" />
          <h2 className="text-sm font-bold text-white tracking-[0.2em] uppercase">
            Verificación en dos pasos
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          HOLA, <span className="text-white font-bold">{email.split('@')[0].toUpperCase()}</span>
        </p>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          Introducí tu código de Google Authenticator
        </p>
      </div>

      {errorMsg && (
        <p className="text-[10px] text-[#D00000] font-bold uppercase tracking-wider text-center bg-red-950/40 border border-red-900/50 rounded-sm p-2">
          {errorMsg}
        </p>
      )}

      <input
        type="text"
        inputMode="numeric"
        value={codigo}
        onChange={handleCodigoChange}
        className="bg-slate-950 border border-t-2 border-slate-800 border-t-[#D00000] text-white text-center text-3xl tracking-[0.5em] rounded-sm focus:ring-0 focus:border-[#D00000] block w-full p-4 placeholder-slate-800 font-mono transition-all shadow-inner"
        placeholder="••••••"
        autoFocus
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading || codigo.length !== 6}
        className="w-full bg-slate-100 hover:bg-white disabled:bg-slate-700 text-slate-900 disabled:text-slate-500 font-bold tracking-widest rounded-sm border border-slate-200 transition-all uppercase shadow-[0_0_15px_rgba(255,255,255,0.1)] py-3 flex items-center justify-center"
      >
        {loading ? <Loader className="w-4 h-4 animate-spin text-slate-700" /> : 'ENTRAR AHORA'}
      </button>
    </form>
  );
};

Verify2FAScreen.propTypes = {
  usuario: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  email: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default Verify2FAScreen;
