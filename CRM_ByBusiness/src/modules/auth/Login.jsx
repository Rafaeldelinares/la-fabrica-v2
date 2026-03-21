import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Lock, ShieldCheck, Terminal, Loader } from 'lucide-react';
import { useAuth } from './AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';

const N8N_WEBHOOK = import.meta.env.VITE_N8N_URL;

/**
 * Login — Pantalla de autenticación con soporte TOTP MFA.
 * Fase CREDENTIALS → valida email+contraseña vía n8n.
 * Fase 2FA → valida código TOTP de 6 dígitos.
 */
const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [phase, setPhase] = useState('CREDENTIALS');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const pendingUser = useRef(null);
  const autoValidateTimer = useRef(null);

  // State for MFA Mode: 'VERIFY' (Input) vs 'SETUP' (QR)
  const [mfaMode, setMfaMode] = useState('VERIFY');

  useEffect(() => () => clearTimeout(autoValidateTimer.current), []);

  /** Crea un generador TOTP a partir del secreto base32 del usuario. */
  const getTotpGenerator = (secret) => new OTPAuth.TOTP({
    issuer: 'ByBusiness',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  /** Envía credenciales a n8n y avanza a fase 2FA si el usuario tiene TOTP activo. */
  const handleCredentials = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch(`${N8N_WEBHOOK}/crm-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });
      const data = await res.json();
      if (data.ok && data.usuario) {
        pendingUser.current = data.usuario;
        if (!data.usuario.totp_habilitado) {
          login(data.usuario);
        } else {
          setPhase('2FA');
        }
      } else {
        setErrorMsg(data.error || 'ACCESO DENEGADO: Credenciales incorrectas.');
        setPassword('');
      }
    } catch {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  /** Valida el código TOTP introducido contra el secreto del usuario pendiente. */
  const validateCode = (code) => {
    const user = pendingUser.current;
    if (!user?.totp_secret) return false;
    const gen = getTotpGenerator(user.totp_secret);
    const delta = gen.validate({ token: code, window: 2 });
    if (delta !== null) {
      login(user);
      return true;
    }
    return false;
  };

  /** Maneja el submit del formulario TOTP validando el código de 6 dígitos. */
  const handleToken = (e) => {
    e.preventDefault();
    if (!totp || totp.length !== 6) return;
    const success = validateCode(totp);
    if (!success) {
      setErrorMsg('CÓDIGO ERRÓNEO. Sincroniza tu reloj e inténtalo de nuevo.');
      setTotp('');
    }
  };

  const otpUri = pendingUser.current?.totp_secret
    ? getTotpGenerator(pendingUser.current.totp_secret).toString()
    : '';

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center relative overflow-hidden font-mono text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none"></div>

      <div className="z-10 w-full max-w-md p-8">

        {/* BRAND IDENTITY */}
        <div className="flex flex-col items-center mb-10 animate-fade-in-down">
          <img
            src="/bybusiness-logo-white.png"
            alt="ByBusiness Industrial Intelligence"
            className="h-20 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          />
          <span className="text-[10px] text-[#D00000] font-mono tracking-[0.5em] mt-3 opacity-80">INDUSTRIAL INTELLIGENCE</span>
        </div>

        <div className="backdrop-blur-xl bg-slate-900/90 border border-slate-700 shadow-2xl p-8 relative rounded-sm overflow-hidden">

          <div className="flex flex-col items-center mb-8 border-b border-slate-800 pb-4">
            <h1 className="text-sm font-bold text-white tracking-[0.2em] uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D00000]" />
              {phase === 'CREDENTIALS' ? 'ACCESO RESTRINGIDO' : 'VERIFICACIÓN MFA'}
            </h1>
          </div>

          {phase === 'CREDENTIALS' ? (
            <form className="flex flex-col gap-6" onSubmit={handleCredentials}>
              {errorMsg && (
                <p className="text-[10px] text-[#D00000] font-bold uppercase tracking-wider text-center bg-red-950/40 border border-red-900/50 rounded-sm p-2">{errorMsg}</p>
              )}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D00000] to-red-900 rounded-sm opacity-0 group-hover:opacity-30 transition duration-500 blur"></div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="relative bg-slate-950 border border-slate-700 text-white text-sm rounded-sm focus:ring-[#D00000] focus:border-[#D00000] block w-full p-3 placeholder-slate-600 font-mono tracking-wide transition-all"
                  placeholder="EMAIL"
                  required
                />
              </div>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative bg-slate-950 border border-slate-700 text-white text-sm rounded-sm focus:ring-[#D00000] focus:border-[#D00000] block w-full p-3 placeholder-slate-600 font-mono tracking-wide transition-all"
                  placeholder="Contraseña"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D00000] hover:bg-red-800 disabled:bg-slate-700 text-white font-bold tracking-widest rounded-sm border border-red-900 transition-all uppercase flex items-center justify-center py-3 shadow-lg hover:shadow-red-900/40 relative overflow-hidden group"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : (<><div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div><Lock className="w-3 h-3 mr-2" />VALIDAR USUARIO</>)}
              </button>
            </form>
          ) : (
            <form className="flex flex-col gap-6 animate-fadeIn" onSubmit={handleToken}>

              {/* MODE: VERIFY (DEFAULT) */}
              {mfaMode === 'VERIFY' && (
                <>
                  <div className="text-center space-y-2 mb-2">
                    <p className="text-xs text-slate-400">HOLA, <span className="text-white font-bold">{email.split('@')[0].toUpperCase()}</span></p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Introduce código de Google Auth</p>
                  </div>

                  {errorMsg && (
                    <p className="text-[10px] text-[#D00000] font-bold uppercase tracking-wider text-center bg-red-950/40 border border-red-900/50 rounded-sm p-2">{errorMsg}</p>
                  )}

                  <div className="relative">
                    <input
                      type="text"
                      value={totp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 6) setTotp(val);
                        if (val.length === 6) {
                          clearTimeout(autoValidateTimer.current);
                          autoValidateTimer.current = setTimeout(() => {
                            const success = validateCode(val);
                            if (!success) {
                              setErrorMsg('CÓDIGO ERRÓNEO. Sincroniza tu reloj.');
                              setTotp('');
                            }
                          }, 50);
                        }
                      }}
                      className="bg-slate-950 border border-t-2 border-slate-800 border-t-[#D00000] text-white text-center text-3xl tracking-[0.5em] rounded-sm focus:ring-0 focus:border-[#D00000] block w-full p-4 placeholder-slate-800 font-mono transition-all shadow-inner"
                      placeholder="••••••"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold tracking-widest rounded-sm border border-slate-200 transition-all uppercase shadow-[0_0_15px_rgba(255,255,255,0.1)] py-3 flex items-center justify-center"
                  >
                    ENTRAR AHORA
                  </button>

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setMfaMode('SETUP')}
                      className="text-[9px] text-slate-500 hover:text-[#D00000] underline decoration-slate-900 underline-offset-4 transition-colors uppercase tracking-wider"
                    >
                      ¿Nuevo dispositivo? Vincular Ahora
                    </button>
                  </div>
                </>
              )}

              {/* MODE: SETUP (HIDDEN BY DEFAULT) */}
              {mfaMode === 'SETUP' && (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 relative group rounded-sm animate-fadeIn">
                  <QRCodeSVG
                    value={otpUri}
                    size={160}
                    level={"M"}
                    className="p-2 bg-white rounded-sm mb-4"
                    imageSettings={{ src: "/bybusiness-icon.ico", height: 24, width: 24, excavate: true }}
                  />
                  <p className="text-[10px] text-[#D00000] font-bold uppercase mb-2">MODO VINCULACIÓN</p>
                  <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                    1. Abre Google Authenticator<br />
                    2. Pulsa "+" y escanea este código<br />
                    3. Vuelve atrás y escribe los números
                  </p>
                  <button
                    type="button"
                    onClick={() => setMfaMode('VERIFY')}
                    className="mt-6 text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-sm transition-colors w-full uppercase font-bold"
                  >
                    Listo, Volver a Login
                  </button>
                </div>
              )}
            </form>
          )}

          <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-600 font-mono">
            <span className="flex items-center gap-1"><Terminal className="w-3 h-3" /> TERM-01</span>
            <span>SECURE LINK: 5432</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
