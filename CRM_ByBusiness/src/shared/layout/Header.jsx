import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';

const Header = ({ title }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-20 sticky top-0 shadow-lg">
      <div className="flex items-center gap-4">
        {/* LOGO REPLACEMENT */}
        <img
          src="/bybusiness-logo.png"
          alt="ByBusiness"
          className="h-10 w-auto object-contain pl-1" // Adjusted height to fit h-16 container
        />
      </div>

      {/* CONTEXT TITLE (Centered) */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <h1 className="text-xl font-bold text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          {title === 'PANEL' ? 'PANEL DE CONTROL' : title}
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right hidden sm:block leading-tight">
          <p className="text-sm font-bold text-slate-200 uppercase">{user?.email || 'OPERATOR'}</p>
          <p className="text-[10px] text-slate-500 font-mono tracking-wider">ROLE: {user?.role || 'GUEST'}</p>
        </div>
        <button
          onClick={logout}
          className="bg-[#D00000] hover:bg-red-800 text-white px-4 py-2 text-xs font-bold tracking-wider flex items-center gap-2 transition-all rounded-lg uppercase shadow-md"
        >
          <LogOut className="h-3 w-3" />
          Cierre Sesión
        </button>
      </div>
    </header>
  );
};

export default Header;
