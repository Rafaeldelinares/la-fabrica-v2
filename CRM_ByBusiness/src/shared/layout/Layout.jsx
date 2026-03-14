
import React from 'react';
import Header from './Header';

const Layout = ({ children, title }) => {
  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <Header title={title} />

      {/* Main area — fills remaining height, no padding, no scroll */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Fixed Footer */}
      <footer className="h-10 bg-slate-950 border-t border-slate-800 flex items-center justify-center shrink-0">
        <p className="text-xs text-slate-600 font-mono tracking-widest">CRM ByBusiness &copy; 2026 — La Fábrica IA</p>
      </footer>
    </div>
  );
};

export default Layout;
