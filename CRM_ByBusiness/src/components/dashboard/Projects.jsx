import React from 'react';
import { FolderKanban } from 'lucide-react';

const Projects = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fadeIn">
        <FolderKanban className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-white mb-2">MÓDULO PROYECTOS</h2>
        <p className="font-mono text-xs">CARGANDO TABLERO KANBAN...</p>
    </div>
);

export default Projects;
