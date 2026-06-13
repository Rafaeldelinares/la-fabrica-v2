import React, { useState, useRef } from 'react';
import { ShieldCheck, Terminal } from 'lucide-react';
import { useAuth } from './AuthContext';
import CredentialsForm from './CredentialsForm';
import Setup2FAScreen from './Setup2FAScreen';
import Verify2FAScreen from './Verify2FAScreen';

const N8N_WEBHOOK = import.meta.env.VITE_N8N_URL;
const API_URL = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Login — Pantalla de autenticación con soporte 2FA TOTP completo.
 *
 * Fases:
 *  CREDENTIALS → email + contraseña validados via API o n8n
 *  SETUP_2FA   → totp_habilitado=true && totp_configurado=false → QR + primer código
 *  VERIFY_2FA  → totp_habilitado=true && totp_configurado=true  → código 6 dígitos
 */
const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useState('CREDENTIALS');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState('');
  const pendingUser = useRef(null);

  const doLogin = async (emailToLogin, passwordToUse) => {
    const res = await fetch(`${N8N_WEBHOOK}/crm-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailToLogin.toLowerCase().trim(), password: passwordToUse }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} — ${errBody || 'sin cuerpo'}`);
    }
    return res.json();
  };

  const doLoginApi = async (emailToLogin, passwordToUse) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailToLogin.toLowerCase().trim(), password: passwordToUse }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} — ${errBody || 'sin cuerpo'}`);
    }
    const data = await res.json();
    if (data.ok && data.user) {
      return {
        ok: true,
        usuario: {
          id: data.user.id,
          nombre: data.user.nombre,
          email: data.user.email,
          rol: data.user.rol || 'operador',
          totp_habilitado: data.user.totp_habilitado || false,
          totp_configurado: data.user.totp_configurado || false,
          // totp_secret solo viene si 2FA está activo y no configurado (para setup inicial)
          totp_secret: data.user.totp_secret || undefined,
          es_simulacion: data.user.es_simulacion ?? false,
        },
      };
    }
    return data;
  };

  /** Envía credenciales y decide la fase siguiente. */
  const handleCredentials = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      let data;
      if (API_URL) {
        data = await doLoginApi(email, password);
      } else {
        data = await doLogin(email, password);
      }
      if (data.ok && data.usuario) {
        pendingUser.current = data.usuario;
        if (!data.usuario.totp_habilitado) {
          login(data.usuario);
        } else if (!data.usuario.totp_configurado) {
          setPhase('SETUP_2FA');
        } else {
          setPhase('VERIFY_2FA');
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

  /** Callback cuando Setup2FA o Verify2FA verifican correctamente el TOTP. */
  const handle2FASuccess = () => login(pendingUser.current);

  /** Envía request de reset de contraseña desde el modal. */
  const handleSubmitResetPassword = async (resetEmail) => {
    setResetLoading(true);
    setResetResult('');
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setResetResult(`Tu nueva contraseña fue enviada a ${resetEmail}. Revisa tu bandeja de entrada.`);
      } else {
        setResetResult(data.message || 'No se pudo completar la solicitud.');
      }
    } catch {
      setResetResult('Error de conexión con el servidor.');
    } finally {
      setResetLoading(false);
    }
  };

  const phaseTitle = {
    CREDENTIALS: 'ACCESO RESTRINGIDO',
    SETUP_2FA: 'ACTIVAR AUTENTICADOR',
    VERIFY_2FA: 'VERIFICACIÓN MFA',
  }[phase];

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center relative overflow-hidden font-mono text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

      <div className="z-10 w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-10 animate-fade-in-down">
          <img
            src="/bybusiness-logo-white.png"
            alt="ByBusiness Industrial Intelligence"
            className="h-20 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          />
          <span className="text-[10px] text-[#D00000] font-mono tracking-[0.5em] mt-3 opacity-80">
            INDUSTRIAL INTELLIGENCE
          </span>
        </div>

        <div className="backdrop-blur-xl bg-slate-900/90 border border-slate-700 shadow-2xl p-8 relative rounded-sm overflow-hidden">
          <div className="flex flex-col items-center mb-8 border-b border-slate-800 pb-4">
            <h1 className="text-sm font-bold text-white tracking-[0.2em] uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D00000]" />
              {phaseTitle}
            </h1>
          </div>

          {phase === 'CREDENTIALS' && (
            <CredentialsForm
              email={email}
              password={password}
              loading={loading}
              errorMsg={errorMsg}
              onEmailChange={(e) => setEmail(e.target.value)}
              onPasswordChange={(e) => setPassword(e.target.value)}
              onSubmit={handleCredentials}
              onSubmitResetPassword={handleSubmitResetPassword}
              resetLoading={resetLoading}
              resetResult={resetResult}
            />
          )}

          {phase === 'SETUP_2FA' && pendingUser.current && (
            <Setup2FAScreen
              usuario={pendingUser.current}
              onSuccess={handle2FASuccess}
            />
          )}

          {phase === 'VERIFY_2FA' && pendingUser.current && (
            <Verify2FAScreen
              usuario={pendingUser.current}
              email={email}
              onSuccess={handle2FASuccess}
            />
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