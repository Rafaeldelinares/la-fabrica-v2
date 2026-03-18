import React from 'react';
import PropTypes from 'prop-types';
import { Mail, Briefcase, Scale } from 'lucide-react';

/**
 * Footer del escaparate ia-bybusiness.es con identidad legal LSSI.
 *
 * @param {object}   props
 * @param {Function} props.onContact - Abre modal de contacto.
 * @param {Function} props.onATS     - Abre modal de candidatura.
 * @param {Function} props.onLegal   - Abre modal legal.
 */
const Footer = ({ onContact, onATS, onLegal }) => (
  <footer className="bg-white border-t border-slate-100 w-full py-6 mt-auto">
    <div className="max-w-7xl mx-auto px-8 flex flex-col gap-4">

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            className="h-6 saturate-0 opacity-40 hover:saturate-100 hover:opacity-100 transition-all"
            alt="ia-bybusiness logo"
          />
          <p className="border-l border-slate-100 pl-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            © 2026 IA-BYBUSINESS DIGITAL MASTER
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-10 text-[10px] font-black uppercase tracking-widest">
          <button
            onClick={onContact}
            className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 font-black"
          >
            <Mail className="w-4 h-4" /> CONTACTA
          </button>
          <button
            onClick={onATS}
            className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 font-black"
          >
            <Briefcase className="w-4 h-4" /> TRABAJA
          </button>
          <button
            onClick={onLegal}
            className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 font-black"
          >
            <Scale className="w-4 h-4" /> LEGAL
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">CONECTADO A LA FÁBRICA</span>
        </div>
      </div>

      <p className="text-center text-[9px] text-slate-300 font-bold uppercase tracking-widest border-t border-slate-50 pt-4">
        ia-bybusiness es una marca de{' '}
        <a
          href="https://www.bybusiness.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-blue-600 transition-colors"
        >
          AGENCIA PARTNER BYBUSINESS
        </a>
        {' '}· Rosa María Passalacqua Herrera · NIF 77423412F · Calle Cuevas Bajas, 4 · Málaga · info@bybusiness.es
      </p>

    </div>
  </footer>
);

Footer.propTypes = {
  onContact: PropTypes.func.isRequired,
  onATS: PropTypes.func.isRequired,
  onLegal: PropTypes.func.isRequired,
};

export default Footer;
