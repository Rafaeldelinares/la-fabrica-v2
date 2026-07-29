import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Loader, AlertTriangle, RefreshCw } from 'lucide-react';
import { n8nPost } from '../../shared/hooks/useN8n';

/**
 * Verify2FAScreen — Pantalla de verificación TOTP para usuarios con 2FA ya configurado.
 * Se muestra cuando totp_habilitado=true && totp_configurado=true.
 * Llama al webhook crm-verificar-2fa y, si OK, navega al CRM.
 *
 * Si el usuario perdió su app de autenticador, puede re-vincular:
 *   1. Click "¿Perdiste tu autenticador?"
 *   2. El componente llama a crm-activar-2fa (regenera el secret)
 *   3. Muestra QR + input para verificar
 *   4. Al verificar OK, el backend marca totp_configurado=true y onSuccess()
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

  // Estado de re-vinculación
  const [rebinding, setRebinding] = useState(false);
  const [rebindingLoading, setRebindingLoading] = useState(false);
  const [newSecret, setNewSecret] = useState(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const verificar = async (val, isSetup = false) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const data = await n8nPost('crm-verificar-2fa', {
        usuario_id: usuario.id,
        codigo: val,
        is_setup: isSetup,
      });
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
      if (val.length === 6 && !rebinding) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => verificar(val, false), 50);
      }
    }
  };

  const handleCodigoRebindChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 6) {
      setCodigo(val);
      if (val.length === 6) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => verificar(val, true), 50);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (codigo.length === 6) verificar(codigo, rebinding);
  };

  const handleRebind = async () => {
    setErrorMsg('');
    setRebindingLoading(true);
    try {
      const data = await n8nPost('crm-activar-2fa', { id: usuario.id });
      if (data.ok && data.totp_secret) {
        setNewSecret(data.totp_secret);
        setRebinding(true);
        setCodigo('');
      } else {
        setErrorMsg(data.error || 'No se pudo generar un nuevo código. Contactá al administrador.');
      }
    } catch {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setRebindingLoading(false);
    }
  };

  const handleCancelRebind = () => {
    setRebinding(false);
    setNewSecret(null);
    setCodigo('');
    setErrorMsg('');
  };

  const otpUri = newSecret
    ? `otpauth://totp/CRM%20ByBusiness:${encodeURIComponent(usuario.email)}?secret=${newSecret}&issuer=CRM%20ByBusiness`
    : '';

  // Modo re-vinculación: QR + input
  if (rebinding && newSecret) {
    return (
      <div className="flex flex-col gap-6 animate-fadeIn">
        <div className="text-center space-y-1 mb-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5 text-[#D00000]" />
            <h2 className="text-sm font-bold text-white tracking-[0.2em] uppercase">
              Re-vincular autenticador
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            Escaneá este nuevo código con tu app de autenticador
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
              NUEVA CLAVE GENERADA
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed text-center">
              1. Borrá la entrada vieja de tu app<br />
              2. Escaneá este código<br />
              3. Ingresá los 6 dígitos para confirmar
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMsg && (
            <p className="text-[10px] text-[#D00000] font-bold uppercase tracking-wider text-center bg-red-950/40 border border-red-900/50 rounded-sm p-2">
              {errorMsg}
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={codigo}
            onChange={handleCodigoRebindChange}
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
            {loading ? <Loader className="w-4 h-4 animate-spin text-slate-700" /> : 'CONFIRMAR NUEVA VINCULACIÓN'}
          </button>
          <button
            type="button"
            onClick={handleCancelRebind}
            className="text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
          >
            Cancelar
          </button>
        </form>
      </div>
    );
  }

  // Modo normal: solo input
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
        disabled={loading || rebindingLoading}
      />

      <button
        type="submit"
        disabled={loading || codigo.length !== 6 || rebindingLoading}
        className="w-full bg-slate-100 hover:bg-white disabled:bg-slate-700 text-slate-900 disabled:text-slate-500 font-bold tracking-widest rounded-sm border border-slate-200 transition-all uppercase shadow-[0_0_15px_rgba(255,255,255,0.1)] py-3 flex items-center justify-center"
      >
        {loading ? <Loader className="w-4 h-4 animate-spin text-slate-700" /> : 'ENTRAR AHORA'}
      </button>

      <button
        type="button"
        onClick={handleRebind}
        disabled={rebindingLoading || loading}
        className="flex items-center justify-center gap-2 text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors disabled:opacity-40 mt-2 py-2"
      >
        {rebindingLoading ? (
          <>
            <Loader className="w-3 h-3 animate-spin" />
            Generando nueva clave…
          </>
        ) : (
          <>
            <AlertTriangle className="w-3 h-3" />
            ¿Perdiste tu autenticador? Generar nuevo QR
          </>
        )}
      </button>
    </form>
  );
};

Verify2FAScreen.propTypes = {
  usuario: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  email: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default Verify2FAScreen;
