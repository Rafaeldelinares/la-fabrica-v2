import React from 'react';
import { Calendar } from 'lucide-react';

const Agenda = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fadeIn">
        <Calendar className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-white mb-2">MÓDULO AGENDA</h2>
        <p className="font-mono text-xs">CONECTANDO API GOOGLE CALENDAR...</p>
    </div>
);

export default Agenda;
