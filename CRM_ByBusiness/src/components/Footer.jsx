import React from 'react';
import { Database, Clock, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Footer = ({ activeTab }) => {
  const { timeLeft } = useAuth();
  
  // Format MM:SS
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isCritical = timeLeft < 30000; // Less than 30s

  // Determine message type based on context (Basic logic for now)
  // Can be expanded to receive real alert objects
  let messageType = 'info'; // info | warning | alert
  let messageText = "";

  const baseMessage = "*** SISTEMA ONLINE *** MONITOREO ACTIVO EN VPS 192.168.1.13 *** CARGA DE CPU: 12% ***";

  if (activeTab === 'PANEL') {
      messageText = `${baseMessage} VISTA: PANEL DE CONTROL - LIVE FEED (SIMULATED)`;
      messageType = 'info';
  } else if (activeTab === 'AGENDA') {
      messageText = `${baseMessage} VISTA: AGENDA OPERATIVA - SINCRONIZADA`;
      messageType = 'info'; // Could be 'warning' if sync is pending
  } else if (activeTab === 'PROYECTOS') {
      messageText = `${baseMessage} VISTA: PROYECTOS - ACCESO RESTRINGIDO`;
      messageType = 'warning'; 
  } else if (activeTab === 'USUARIOS') {
      messageText = `${baseMessage} VISTA: ADMINISTRACIÓN DE USUARIOS - MODO AUDITORÍA`;
      messageType = 'alert'; // Example: Admin zone alerts
  } else {
      messageText = baseMessage;
  }

  // Visual Rules for Text Color
  const getTextColor = (type) => {
      switch (type) {
          case 'alert': return 'text-red-500';
          case 'warning': return 'text-amber-500';
          case 'info': default: return 'text-blue-300';
      }
  };

  return (
    <footer className="h-10 mx-4 mb-4 bg-slate-950/90 backdrop-blur-md border border-slate-800 flex items-center justify-between px-6 text-[10px] font-bold rounded-xl shadow-lg z-50 font-mono relative overflow-hidden">
       
       {/* Background Grid Pattern - Subtle */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none"></div>

       {/* LEFT: CONNECTION STATUS */}
       <div className="flex items-center gap-2 z-10 bg-slate-950/90 py-1 pr-4">
          <Database className="h-3 w-3 text-slate-500" />
          <span className="tracking-widest hidden sm:inline text-slate-400">DB: VPS_MIRROR</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-2"></div>
       </div>

       {/* CENTER: NEWS TICKER */}
       <div className="flex-1 mx-4 overflow-hidden relative h-full flex items-center group">
          <div className={`absolute whitespace-nowrap animate-ticker ${getTextColor(messageType)} font-mono text-xs tracking-wider drop-shadow-md group-hover:pause`}>
             <Terminal className="inline-block w-3 h-3 mr-2 mb-0.5" />
             {messageText}
          </div>
          {/* Gradient Masks (Matching Background) */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10"></div>
       </div>

       {/* RIGHT: SESSION TIMER & VERSION */}
       <div className="flex items-center gap-4 z-10 bg-slate-950/90 py-1 pl-4">
          <div className={`flex items-center gap-2 px-2 py-0.5 rounded transition-all ${isCritical ? 'bg-red-900/50 text-red-200 animate-pulse border border-red-800' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
             <Clock className="w-3 h-3" />
             <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
          <span className="opacity-50 hidden sm:inline text-slate-600">V:1.1.0</span>
       </div>
    </footer>
  );
};

export default Footer;
