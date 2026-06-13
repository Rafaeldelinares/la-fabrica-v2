import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Loader } from 'lucide-react';

const N8N_WEBHOOK = import.meta.env.VITE_N8N_URL;

/**
 * Setup2FAScreen — Pantalla de vinculación inicial de autenticador TOTP.
 * Se muestra cuando totp_habilitado=true && totp_configurado=false.
 * El usuario escanea el QR y verifica con un código de 6 dígitos.
 * Si OK, el backend marca totp_configurado=true y se entra al CRM.
 *
 * @param {Object} props
 * @param {Object} props.usuario - Datos del usuario con id, email, totp_secret
 * @param {Function} props.onSuccess - Callback cuando la verificación es exitosa
 */
const Setup2FAScreen = ({ usuario, onSuccess }) => {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const otpUri = `otpauth://totp/CRM%20ByBusiness:${encodeURIComponent(usuario.email)}?secret=${usuario.totp_secret}&issuer=CRM%20ByBusiness`;

  const handleVerificar = async (e) => {
    e.preventDefault();
    if (codigo.length !== 6) return;
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch(`${N8N_WEBHOOK}/crm-verificar-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuario.id, codigo, is_setup: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok) {
        onSuccess();
      } else {
        setErrorMsg(data.error || 'CÓDIGO ERRÓNEO. Intentá de nuevo.');
        setCodigo('');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error && err.message.startsWith('HTTP') ? 'Error de conexión con el servidor' : 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCodigoChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 6) setCodigo(val);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="text-center space-y-1 mb-2">
        <div className="flex items-center justify-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-[#D00000]" />
          <h2 className="text-sm font-bold text-white tracking-[0.2em] uppercase">
            Configurá tu autenticador
          </h2>
        </div>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest">
          Escaneá este código con Google Authenticator o Authy
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 p-6 bg-slate-950 border border-slate-800 rounded-sm">
        <QRCodeSVG
          value={otpUri}
          size={160}
          level="M"
          className="p-2 bg-white rounded-sm"
          imageSettings={{ src: '/bybusiness-icon.ico', height: 24, width: 24, excavate: true }}
        />
        <div className="text-center space-y-1">
          <p className="text-[10px] text-[#D00000] font-bold uppercase tracking-wider">
            MODO VINCULACIÓN
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed text-center">
            1. Abrí Google Authenticator o Authy<br />
            2. Tocá "+" y escaneá este código<br />
            3. Ingresá los 6 dígitos para confirmar
          </p>
        </div>
      </div>

      <form onSubmit={handleVerificar} className="flex flex-col gap-4">
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
        />
        <button
          type="submit"
          disabled={loading || codigo.length !== 6}
          className="w-full bg-[#D00000] hover:bg-red-800 disabled:bg-slate-700 text-white font-bold tracking-widest rounded-sm border border-red-900 transition-all uppercase flex items-center justify-center py-3 shadow-lg"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Verificar y activar'}
        </button>
      </form>
    </div>
  );
};

Setup2FAScreen.propTypes = {
  usuario: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    email: PropTypes.string.isRequired,
    totp_secret: PropTypes.string.isRequired,
  }).isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default Setup2FAScreen;
