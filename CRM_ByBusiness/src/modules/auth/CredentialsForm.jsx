import React from 'react';
import PropTypes from 'prop-types';
import { Lock, Loader } from 'lucide-react';

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
 */
const CredentialsForm = ({ email, password, loading, errorMsg, onEmailChange, onPasswordChange, onSubmit }) => (
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
        type="password"
        value={password}
        onChange={onPasswordChange}
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
  </form>
);

CredentialsForm.propTypes = {
  email: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  onEmailChange: PropTypes.func.isRequired,
  onPasswordChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default CredentialsForm;
