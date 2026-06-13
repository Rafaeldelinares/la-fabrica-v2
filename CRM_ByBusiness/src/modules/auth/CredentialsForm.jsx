import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Lock, Loader, Eye, EyeOff, KeyRound, X } from 'lucide-react';

/**
 * CredentialsForm — Formulario de email + contraseña del Login.
 *
 * @param {Object} props
 * @param {string} props.email
 * @param {string} props.password
 * @param {boolean} props.loading
 * @param {string} props.errorMsg
 * @param {Function} props.onEmailChange
 * @param {Function} props.onPasswordChange
 * @param {Function} props.onSubmit
 * @param {Function} props.onSubmitResetPassword
 * @param {boolean} props.resetLoading
 * @param {string} props.resetResult
 */
const CredentialsForm = ({ email, password, loading, errorMsg, onEmailChange, onPasswordChange, onSubmit, onSubmitResetPassword, resetLoading, resetResult }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');

  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (!resetEmailInput.trim()) return;
    onSubmitResetPassword(resetEmailInput);
  };

  return (
  <>
  <form className="flex flex-col gap-6" onSubmit={onSubmit}>
    {errorMsg && (
      <p className="text-[10px] text-[#D00000] font-bold uppercase tracking-wider text-center bg-red-950/40 border border-red-900/50 rounded-sm p-2">
        {errorMsg}
      </p>
    )}
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D00000] to-red-900 rounded-sm opacity-0 group-hover:opacity-30 transition duration-500 blur" />
      <input
        type="email"
        value={email}
        onChange={onEmailChange}
        className="relative bg-slate-950 border border-slate-700 text-white text-sm rounded-sm focus:ring-[#D00000] focus:border-[#D00000] block w-full p-3 placeholder-slate-600 font-mono tracking-wide transition-all"
        placeholder="EMAIL"
        required
      />
    </div>
    <div className="relative group">
      <input
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={onPasswordChange}
        className="relative bg-slate-950 border border-slate-700 text-white text-sm rounded-sm focus:ring-[#D00000] focus:border-[#D00000] block w-full p-3 pr-10 placeholder-slate-600 font-mono tracking-wide transition-all"
        placeholder="Contraseña"
        required
      />
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-200 transition-colors"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-[#D00000] hover:bg-red-800 disabled:bg-slate-700 text-white font-bold tracking-widest rounded-sm border border-red-900 transition-all uppercase flex items-center justify-center py-3 shadow-lg hover:shadow-red-900/40 relative overflow-hidden group"
    >
      {loading
        ? <Loader className="w-4 h-4 animate-spin" />
        : (
          <>
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <Lock className="w-3 h-3 mr-2" />
          VALIDAR USUARIO
        </>
        )}
    </button>

    <button
      type="button"
      onClick={() => { setShowResetModal(true); setResetEmailInput(email); }}
      className="text-[10px] text-slate-500 hover:text-[#D00000] font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
    >
      <KeyRound className="w-3 h-3" />
      ¿Olvidaste tu contraseña?
    </button>
  </form>

  {showResetModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-full max-w-md shadow-2xl relative">
        <button
          type="button"
          onClick={() => { setShowResetModal(false); }}
          aria-label="Cerrar"
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-[#D00000]" />
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Recuperar contraseña</h2>
        </div>
        <p className="text-[10px] text-slate-400 font-mono mb-4 leading-relaxed">
          Te enviaremos una nueva contraseña al email registrado. Revisá tu bandeja de entrada (y spam).
        </p>
        <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={resetEmailInput}
            onChange={(e) => setResetEmailInput(e.target.value)}
            placeholder="tu@email.com"
            required
            autoFocus
            className="bg-slate-950 border border-slate-700 text-white text-sm rounded-sm focus:ring-[#D00000] focus:border-[#D00000] block w-full p-3 placeholder-slate-600 font-mono tracking-wide"
          />
          {resetResult && (
            <p className={`text-[10px] font-mono p-2 rounded-sm border ${
              resetResult.toLowerCase().includes('enviada')
                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50'
                : 'text-[#D00000] bg-red-950/40 border-red-900/50'
            }`}>
              {resetResult}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowResetModal(false); }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold tracking-widest rounded-sm border border-slate-700 transition-all uppercase py-2.5 text-[10px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={resetLoading || !resetEmailInput.trim()}
              className="flex-1 bg-[#D00000] hover:bg-red-800 disabled:bg-slate-700 text-white font-bold tracking-widest rounded-sm border border-red-900 transition-all uppercase flex items-center justify-center py-2.5 text-[10px] gap-1.5"
            >
              {resetLoading
                ? <Loader className="w-3 h-3 animate-spin" />
                : <KeyRound className="w-3 h-3" />}
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
  </>
  );
};

CredentialsForm.propTypes = {
  email: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  onEmailChange: PropTypes.func.isRequired,
  onPasswordChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onSubmitResetPassword: PropTypes.func.isRequired,
  resetLoading: PropTypes.bool.isRequired,
  resetResult: PropTypes.string.isRequired,
};

export default CredentialsForm;
